import { Alert, serialize } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listAlerts = asyncHandler(async (req, res) => {
  const limit = Math.min(100, Math.max(1, Math.trunc(Number(req.query.limit)) || 50));
  const where = {};
  if (req.query.isRead === 'true' || req.query.isRead === 'false') where.isRead = req.query.isRead === 'true';
  const [rows, total] = await Promise.all([
    Alert.findAll({ where, order: [['createdAt', 'DESC']], limit, include: [{ association: 'vehicleRecord', attributes: ['_id', 'registrationNo'] }] }),
    Alert.count({ where }),
  ]);
  res.json({ success: true, data: rows.map(serialize), meta: { total, limit } });
});

export const markRead = asyncHandler(async (req, res) => {
  const alert = await Alert.findByPk(req.params.id);
  if (!alert) throw new ApiError(404, 'Alert not found');
  await alert.update({ isRead: true });
  res.json({ success: true, data: alert });
});

export const markAllRead = asyncHandler(async (_req, res) => {
  await Alert.update({ isRead: true }, { where: { isRead: false } });
  res.json({ success: true, message: 'All alerts marked as read' });
});
