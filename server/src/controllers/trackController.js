import { Shipment, serialize } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Public endpoint: returns only customer-safe fields (city coordinates for the map, vehicle plate,
 * driver first name). Timeline notes are internal (they can name staff), so only status + time go out.
 */
export const trackShipment = asyncHandler(async (req, res) => {
  const shipment = await Shipment.findOne({
    where: { trackingId: String(req.params.trackingId).trim().toUpperCase() },
    include: [
      { association: 'vehicleRecord', attributes: ['_id', 'registrationNo', 'type', 'location', 'status'] },
      { association: 'driverRecord', attributes: ['_id', 'name'] },
    ],
  });
  if (!shipment) throw new ApiError(404, 'No shipment found with this tracking ID');
  const s = serialize(shipment);
  const live = s.status === 'In Transit' && s.vehicle?.location ? { lat: s.vehicle.location.lat, lng: s.vehicle.location.lng } : null;
  res.json({
    success: true,
    data: {
      trackingId: s.trackingId,
      status: s.status,
      from: s.pickup.address,
      to: s.delivery.address,
      pickup: { address: s.pickup.address, lat: s.pickup.lat, lng: s.pickup.lng },
      delivery: { address: s.delivery.address, lat: s.delivery.lat, lng: s.delivery.lng },
      vehicleLocation: live,
      vehicle: s.vehicle ? { registrationNo: s.vehicle.registrationNo, type: s.vehicle.type } : null,
      driverName: s.driver?.name ? s.driver.name.split(' ')[0] : null,
      weightKg: s.weightKg,
      distanceKm: s.distanceKm,
      eta: s.eta,
      createdAt: s.createdAt,
      deliveredAt: s.deliveredAt,
      timeline: s.timeline.map(({ status, at }) => ({ status, at })),
    },
  });
});
