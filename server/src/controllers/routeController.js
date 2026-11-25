import { Shipment } from '../models/Shipment.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { estimateMinutes, optimizeStops } from '../utils/geo.js';
import { optimizeSchema } from '../validators/schemas.js';

export const shipmentRoute = asyncHandler(async (req, res) => {
  const s = await Shipment.findByPk(req.params.shipmentId);
  if (!s) throw new ApiError(404, 'Shipment not found');
  res.json({
    success: true,
    data: { source: s.pickup, destination: s.delivery, distanceKm: s.distanceKm, durationMin: estimateMinutes(s.distanceKm) },
  });
});

export const optimizeRoute = asyncHandler(async (req, res) => {
  const { start, stops } = optimizeSchema.parse(req.body);
  const { ordered, totalKm, exact } = optimizeStops(start, stops);
  res.json({ success: true, data: { start, ordered, totalKm, durationMin: estimateMinutes(totalKm), exact } });
});
