import { Vehicle } from '../models/Vehicle.js';
import { Shipment } from '../models/Shipment.js';
import { ACTIVE_SHIPMENT } from '../models/constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const countBy = (rows) => Object.fromEntries(rows.map((r) => [r._id, r.count]));

/**
 * Days are bucketed in the fleet's local time zone (REPORT_TZ, default: the server's zone),
 * not UTC, so a delivery at 04:25 IST counts for that calendar day.
 */
export const REPORT_TZ = process.env.REPORT_TZ || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
const dayFormat = new Intl.DateTimeFormat('en-CA', { timeZone: REPORT_TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
export const dayKey = (d) => dayFormat.format(new Date(d)); // "YYYY-MM-DD"
/** Keys for the last n calendar days, ending today. */
export const lastDayKeys = (n) => Array.from({ length: n }, (_, i) => dayKey(Date.now() - (n - 1 - i) * 86400000));

export const stats = asyncHandler(async (_req, res) => {
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

  const perDay = Object.fromEntries(lastDayKeys(7).map((k) => [k, 0]));
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
      timeZone: REPORT_TZ,
      recent,
    },
  });
});
