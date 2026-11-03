import { Shipment } from '../models/Shipment.js';
import { Vehicle } from '../models/Vehicle.js';
import { Driver } from '../models/Driver.js';
import { TRANSITIONS, TERMINAL } from '../models/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { generateTrackingId } from '../utils/trackingId.js';
import { roadDistanceKm, estimateMinutes } from '../utils/geo.js';
import { assignSchema, shipmentCreateSchema, statusSchema } from '../validators/schemas.js';
import { emit } from '../sockets/io.js';
import { createAlert } from '../services/alertService.js';

const HANDLING_MINUTES = 60;
const populated = (id) => Shipment.findById(id).populate('vehicle driver').lean();

export const createShipment = asyncHandler(async (req, res) => {
  const body = shipmentCreateSchema.parse(req.body);
  const distanceKm = roadDistanceKm(body.pickup, body.delivery);
  const shipment = await Shipment.create({
    ...body,
    trackingId: await generateTrackingId(Shipment),
    distanceKm,
    eta: new Date(Date.now() + (estimateMinutes(distanceKm) + HANDLING_MINUTES) * 60000),
    timeline: [{ status: 'Created', note: 'Shipment created' }],
    createdBy: req.user.id,
  });
  emit('shipment:update', { shipmentId: shipment.id, status: shipment.status });
  res.status(201).json({ success: true, data: shipment });
});

export const assignShipment = asyncHandler(async (req, res) => {
  const { vehicleId, driverId } = assignSchema.parse(req.body);
  const [shipment, vehicle, driver] = await Promise.all([
    Shipment.findById(req.params.id),
    Vehicle.findById(vehicleId),
    Driver.findById(driverId),
  ]);
  if (!shipment) throw new ApiError(404, 'Shipment not found');
  if (!vehicle) throw new ApiError(404, 'Vehicle not found');
  if (!driver) throw new ApiError(404, 'Driver not found');
  if (!['Created', 'Assigned'].includes(shipment.status)) throw new ApiError(400, `Cannot assign a ${shipment.status} shipment`);
  if (vehicle.status === 'maintenance') throw new ApiError(400, 'Vehicle is under maintenance');
  if (driver.status === 'off-duty') throw new ApiError(400, 'Driver is off duty');

  shipment.vehicle = vehicle._id;
  shipment.driver = driver._id;
  shipment.status = 'Assigned';
  shipment.timeline.push({ status: 'Assigned', note: `${vehicle.registrationNo} / ${driver.name}` });
  vehicle.assignedDriver = driver._id;
  vehicle.location = { lat: shipment.pickup.lat, lng: shipment.pickup.lng };
  driver.assignedVehicle = vehicle._id;
  driver.status = 'on-trip';
  await Promise.all([shipment.save(), vehicle.save(), driver.save()]);

  emit('shipment:update', { shipmentId: shipment.id, status: shipment.status });
  res.json({ success: true, data: await populated(shipment.id) });
});

export const updateShipmentStatus = asyncHandler(async (req, res) => {
  const { status, note } = statusSchema.parse(req.body);
  const shipment = await Shipment.findById(req.params.id);
  if (!shipment) throw new ApiError(404, 'Shipment not found');
  if (!(TRANSITIONS[shipment.status] || []).includes(status)) {
    throw new ApiError(400, `Cannot change status from ${shipment.status} to ${status}`);
  }

  shipment.status = status;
  shipment.timeline.push({ status, note });
  if (status === 'Delivered') shipment.deliveredAt = new Date();

  const vehicle = shipment.vehicle ? await Vehicle.findById(shipment.vehicle) : null;
  const driver = shipment.driver ? await Driver.findById(shipment.driver) : null;

  if (status === 'In Transit' && vehicle) {
    vehicle.status = 'moving';
  }
  if (TERMINAL.includes(status)) {
    if (vehicle) {
      vehicle.status = 'idle';
      vehicle.speed = 0;
      vehicle.assignedDriver = null;
      if (status === 'Delivered') vehicle.location = { lat: shipment.delivery.lat, lng: shipment.delivery.lng };
    }
    if (driver) {
      driver.status = 'available';
      driver.assignedVehicle = null;
    }
  }
  await Promise.all([shipment.save(), vehicle?.save(), driver?.save()]);

  emit('shipment:update', { shipmentId: shipment.id, status, eta: shipment.eta });
  if (vehicle) emit('vehicle:status', { vehicleId: vehicle.id, status: vehicle.status });
  if (status === 'Failed') {
    await createAlert({
      type: 'delivery_failed',
      severity: 'critical',
      message: `Delivery ${shipment.trackingId} failed${note ? `: ${note}` : ''}`,
      vehicle: vehicle?._id,
      shipment: shipment._id,
    });
  }
  res.json({ success: true, data: await populated(shipment.id) });
});
