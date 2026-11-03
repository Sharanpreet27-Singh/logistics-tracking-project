import { Shipment } from '../models/Shipment.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Public endpoint: returns only customer-safe fields.
export const trackShipment = asyncHandler(async (req, res) => {
  const s = await Shipment.findOne({ trackingId: String(req.params.trackingId).trim().toUpperCase() }).lean();
  if (!s) throw new ApiError(404, 'No shipment found with this tracking ID');
  res.json({
    success: true,
    data: {
      trackingId: s.trackingId,
      status: s.status,
      from: s.pickup.address,
      to: s.delivery.address,
      distanceKm: s.distanceKm,
      eta: s.eta,
      deliveredAt: s.deliveredAt,
      timeline: s.timeline.map(({ status, note, at }) => ({ status, note, at })),
    },
  });
});
