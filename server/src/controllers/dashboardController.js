import { Op } from 'sequelize';
import { sequelize } from '../config/db.js';
import { Shipment, Vehicle, serialize } from '../models/index.js';
import { ACTIVE_SHIPMENT } from '../models/constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const countBy = (rows) => Object.fromEntries(rows.map(({ status, count }) => [status, Number(count)]));
const statusCounts = (Model) => Model.findAll({
  attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']], group: ['status'], raw: true,
});

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
  const [vehicleRows, shipmentRows, delivered, activeVehicles, recent] = await Promise.all([
    statusCounts(Vehicle),
    statusCounts(Shipment),
    Shipment.findAll({ where: { status: 'Delivered', deliveredAt: { [Op.ne]: null } }, attributes: ['deliveredAt', 'eta'] }),
    Shipment.count({ col: 'vehicle', distinct: true, where: { status: { [Op.in]: ACTIVE_SHIPMENT } } }),
    Shipment.findAll({ order: [['createdAt', 'DESC']], limit: 6, include: ['vehicleRecord', 'driverRecord'] }),
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
      utilization: totalVehicles ? Math.round((activeVehicles / totalVehicles) * 100) : 0,
      timeZone: REPORT_TZ,
      recent: recent.map(serialize),
    },
  });
});
