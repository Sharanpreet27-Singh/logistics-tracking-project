import { Op, Transaction, UniqueConstraintError } from 'sequelize';
import { sequelize } from '../config/db.js';
import { env } from '../config/env.js';
import { Driver, Shipment, Vehicle, serialize } from '../models/index.js';
import { TRANSITIONS, TERMINAL, ACTIVE_SHIPMENT } from '../models/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { makeTrackingId } from '../utils/trackingId.js';
import { roadDistanceKm, estimateMinutes } from '../utils/geo.js';
import { assignSchema, shipmentCreateSchema, statusSchema } from '../validators/schemas.js';
import { emit } from '../sockets/io.js';
import { createAlert } from '../services/alertService.js';

const HANDLING_MINUTES = 60;
const kg = (n) => `${Number(n).toLocaleString('en-IN')} kg`;
const withFleet = (id, transaction) => Shipment.findByPk(id, { include: ['vehicleRecord', 'driverRecord'], transaction });

export const createShipment = asyncHandler(async (req, res) => {
  const body = shipmentCreateSchema.parse(req.body);
  if (body.pickup.address.toLowerCase() === body.delivery.address.toLowerCase()) {
    throw new ApiError(400, 'Pickup and delivery cities must be different');
  }
  const distanceKm = roadDistanceKm(body.pickup, body.delivery);
  const values = {
    ...body,
    distanceKm,
    eta: new Date(Date.now() + (estimateMinutes(distanceKm) + HANDLING_MINUTES) * 60000),
    timeline: [{ status: 'Created', note: 'Shipment created', at: new Date() }],
    createdBy: req.user.id,
  };

  for (let attempt = 1; attempt <= 5; attempt++) {
    let shipment;
    try {
      shipment = await Shipment.create({ ...values, trackingId: makeTrackingId() });
    } catch (error) {
      if (!(error instanceof UniqueConstraintError) || attempt === 5) throw error;
      continue;
    }
    emit('shipment:update', { shipmentId: shipment._id, status: shipment.status });
    return res.status(201).json({ success: true, data: shipment });
  }
});

export const assignShipment = asyncHandler(async (req, res) => {
  const { vehicleId, driverId } = assignSchema.parse(req.body);
  const { shipment, releasedVehicle } = await sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async (transaction) => {
    const locked = { transaction, lock: true };
    const shipment = await Shipment.findByPk(req.params.id, locked);
    if (!shipment) throw new ApiError(404, 'Shipment not found');
    if (!['Created', 'Assigned'].includes(shipment.status)) throw new ApiError(400, `Cannot assign a ${shipment.status} shipment`);

    const vehicle = await Vehicle.findByPk(vehicleId, locked);
    if (!vehicle) throw new ApiError(404, 'Vehicle not found');
    const driver = await Driver.findByPk(driverId, locked);
    if (!driver) throw new ApiError(404, 'Driver not found');
    if (vehicle.status === 'maintenance') throw new ApiError(400, `${vehicle.registrationNo} is under maintenance`);
    if (driver.status === 'off-duty') throw new ApiError(400, `${driver.name} is off duty`);
    if (vehicle.capacityKg < shipment.weightKg) {
      throw new ApiError(400, `${vehicle.registrationNo} can carry ${kg(vehicle.capacityKg)} but this shipment weighs ${kg(shipment.weightKg)}`);
    }

    // Lock the vehicle and driver before looking for competing reservations.
    const active = { _id: { [Op.ne]: shipment._id }, status: { [Op.in]: ACTIVE_SHIPMENT } };
    const vehicleBusy = await Shipment.findOne({ where: { ...active, vehicle: vehicle._id }, attributes: ['trackingId'], transaction });
    if (vehicleBusy) throw new ApiError(400, `${vehicle.registrationNo} is already booked on ${vehicleBusy.trackingId}`);
    const driverBusy = await Shipment.findOne({ where: { ...active, driver: driver._id }, attributes: ['trackingId'], transaction });
    if (driverBusy) throw new ApiError(400, `${driver.name} is already driving ${driverBusy.trackingId}`);

    let releasedVehicle = null;
    if (shipment.vehicle && shipment.vehicle !== vehicle._id) {
      releasedVehicle = shipment.vehicle;
      await Vehicle.update({ status: 'idle', assignedDriver: null }, { where: { _id: releasedVehicle }, transaction });
    }
    if (shipment.driver && shipment.driver !== driver._id) {
      await Driver.update({ status: 'available', assignedVehicle: null }, { where: { _id: shipment.driver }, transaction });
    }

    await shipment.update({
      vehicle: vehicle._id,
      driver: driver._id,
      status: 'Assigned',
      timeline: [...shipment.timeline, { status: 'Assigned', note: `${vehicle.registrationNo} / ${driver.name}`, at: new Date() }],
    }, { transaction });
    const changes = { assignedDriver: driver._id, status: 'booked' };
    if (env.demoMode) {
      changes.speed = 0;
      changes.location = { lat: shipment.pickup.lat, lng: shipment.pickup.lng };
    }
    await vehicle.update(changes, { transaction });
    await driver.update({ assignedVehicle: vehicle._id, status: 'on-trip' }, { transaction });
    return { shipment: await withFleet(shipment._id, transaction), releasedVehicle };
  });

  if (releasedVehicle) emit('vehicle:status', { vehicleId: releasedVehicle, status: 'idle' });
  emit('shipment:update', { shipmentId: shipment._id, status: shipment.status });
  emit('vehicle:status', { vehicleId: shipment.vehicle, status: 'booked' });
  res.json({ success: true, data: serialize(shipment) });
});

export const updateShipmentStatus = asyncHandler(async (req, res) => {
  const { status, note } = statusSchema.parse(req.body);
  const { shipment, vehicle } = await sequelize.transaction(async (transaction) => {
    const locked = { transaction, lock: true };
    const shipment = await Shipment.findByPk(req.params.id, locked);
    if (!shipment) throw new ApiError(404, 'Shipment not found');
    if (!(TRANSITIONS[shipment.status] || []).includes(status)) {
      throw new ApiError(400, `Cannot change status from ${shipment.status} to ${status}`);
    }

    const at = new Date();
    await shipment.update({
      status,
      timeline: [...shipment.timeline, { status, note, at }],
      ...(status === 'Delivered' && { deliveredAt: at }),
    }, { transaction });

    const vehicle = shipment.vehicle ? await Vehicle.findByPk(shipment.vehicle, locked) : null;
    if (status === 'In Transit' && vehicle) await vehicle.update({ status: 'moving' }, { transaction });
    if (TERMINAL.includes(status)) {
      if (vehicle) {
        const changes = { status: 'idle', assignedDriver: null };
        if (env.demoMode) {
          changes.speed = 0;
          if (status === 'Delivered') changes.location = { lat: shipment.delivery.lat, lng: shipment.delivery.lng };
        }
        await vehicle.update(changes, { transaction });
      }
      if (shipment.driver) {
        await Driver.update({ status: 'available', assignedVehicle: null }, { where: { _id: shipment.driver }, transaction });
      }
    }
    if (status === 'Failed') {
      await createAlert({
        type: 'delivery_failed',
        severity: 'critical',
        message: `Delivery ${shipment.trackingId} failed${note ? `: ${note}` : ''}`,
        vehicle: vehicle?._id,
        shipment: shipment._id,
      }, transaction);
    }
    return { shipment: await withFleet(shipment._id, transaction), vehicle };
  });

  emit('shipment:update', { shipmentId: shipment._id, status, eta: shipment.eta });
  if (vehicle) emit('vehicle:status', { vehicleId: vehicle._id, status: vehicle.status });
  res.json({ success: true, data: serialize(shipment) });
});
