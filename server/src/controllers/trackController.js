import { Shipment } from '../models/Shipment.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Public endpoint: returns only customer-safe fields (city coordinates for the map, vehicle plate,
 * driver first name). Timeline notes are internal (they can name staff), so only status + time go out.
 */
export const trackShipment = asyncHandler(async (req, res) => {
  const s = await Shipment.findOne({ trackingId: String(req.params.trackingId).trim().toUpperCase() })
    .populate('vehicle', 'registrationNo type location status')
    .populate('driver', 'name')
    .lean();
  if (!s) throw new ApiError(404, 'No shipment found with this tracking ID');
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
