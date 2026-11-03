import { Vehicle } from '../models/Vehicle.js';
import { Shipment } from '../models/Shipment.js';
import { ACTIVE_SHIPMENT } from '../models/constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const countBy = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count]));
export const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

export const stats = asyncHandler(async (_req, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 6);
  since.setHours(0, 0, 0, 0);

  const [vehicleRows, shipmentRows, delivered, activeVehicleIds, recent] = await Promise.all([
    Vehicle.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Shipment.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Shipment.find({ status: 'Delivered', deliveredAt: { $ne: null } }).select('deliveredAt eta').lean(),
    Shipment.distinct('vehicle', { status: { $in: ACTIVE_SHIPMENT }, vehicle: { $ne: null } }),
    Shipment.find().sort({ createdAt: -1 }).limit(6).populate('vehicle driver').lean(),
  ]);

  const vehicleByStatus = countBy(vehicleRows);
  const shipmentByStatus = countBy(shipmentRows);
  const totalVehicles = Object.values(vehicleByStatus).reduce((a, b) => a + b, 0);
  const totalShipments = Object.values(shipmentByStatus).reduce((a, b) => a + b, 0);

  const perDay = {};
  for (let i = 0; i < 7; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    perDay[dayKey(d)] = 0;
  }
  let onTime = 0;
  for (const s of delivered) {
    const k = dayKey(s.deliveredAt);
    if (k in perDay) perDay[k] += 1;
    if (!s.eta || s.deliveredAt <= s.eta) onTime += 1;
  }

  res.json({
    success: true,
    data: {
      vehicles: { total: totalVehicles, byStatus: vehicleByStatus },
      shipments: { total: totalShipments, byStatus: shipmentByStatus },
      deliveriesPerDay: Object.entries(perDay).map(([date, count]) => ({ date, count })),
      onTimeRate: delivered.length ? Math.round((onTime / delivered.length) * 100) : null,
      utilization: totalVehicles ? Math.round((activeVehicleIds.length / totalVehicles) * 100) : 0,
      recent,
    },
  });
});
