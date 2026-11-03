import { Vehicle } from '../models/Vehicle.js';
import { Driver } from '../models/Driver.js';
import { Shipment } from '../models/Shipment.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { dayKey } from './dashboardController.js';

const isOnTime = (s) => !s.eta || (s.deliveredAt && s.deliveredAt <= s.eta);

async function perResource(Model, field, label) {
  const [items, shipments] = await Promise.all([
    Model.find().lean(),
    Shipment.find({ [field]: { $ne: null } }).select(`${field} status distanceKm deliveredAt eta`).lean(),
  ]);
  return items.map((item) => {
    const mine = shipments.filter((s) => String(s[field]) === String(item._id));
    const delivered = mine.filter((s) => s.status === 'Delivered');
    return {
      id: item._id,
      [label]: item[label],
      totalShipments: mine.length,
      delivered: delivered.length,
      failed: mine.filter((s) => s.status === 'Failed').length,
      distanceKm: Math.round(delivered.reduce((sum, s) => sum + s.distanceKm, 0)),
      onTimeRate: delivered.length ? Math.round((delivered.filter(isOnTime).length / delivered.length) * 100) : null,
      ...(Model === Driver ? { rating: item.rating } : { type: item.type, status: item.status }),
    };
  });
}

export const vehicleReport = asyncHandler(async (_req, res) =>
  res.json({ success: true, data: await perResource(Vehicle, 'vehicle', 'registrationNo') })
);
export const driverReport = asyncHandler(async (_req, res) =>
  res.json({ success: true, data: await perResource(Driver, 'driver', 'name') })
);

export const deliveryReport = asyncHandler(async (req, res) => {
  const to = req.query.to ? new Date(req.query.to) : new Date();
  const from = req.query.from ? new Date(req.query.from) : new Date(to.getTime() - 29 * 86400000);
  const delivered = await Shipment.find({ status: 'Delivered', deliveredAt: { $gte: from, $lte: to } }).lean();
  const days = {};
  for (const s of delivered) {
    const k = dayKey(s.deliveredAt);
    days[k] ||= { date: k, deliveries: 0, distanceKm: 0, onTime: 0 };
    days[k].deliveries += 1;
    days[k].distanceKm += s.distanceKm;
    if (isOnTime(s)) days[k].onTime += 1;
  }
  res.json({ success: true, data: Object.values(days).sort((a, b) => a.date.localeCompare(b.date)) });
});
