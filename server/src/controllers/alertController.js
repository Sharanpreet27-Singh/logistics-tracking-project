import { Alert } from '../models/Alert.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const listAlerts = asyncHandler(async (req, res) => {
  const limit = Math.min(100, Number(req.query.limit) || 50);
  const query = {};
  if (req.query.isRead === 'true' || req.query.isRead === 'false') query.isRead = req.query.isRead === 'true';
  const [data, total] = await Promise.all([
    Alert.find(query).sort({ createdAt: -1 }).limit(limit).populate('vehicle', 'registrationNo').lean(),
    Alert.countDocuments(query),
  ]);
  res.json({ success: true, data, meta: { total, limit } });
});

export const markRead = asyncHandler(async (req, res) => {
  const alert = await Alert.findByIdAndUpdate(req.params.id, { isRead: true }, { new: true });
  if (!alert) throw new ApiError(404, 'Alert not found');
  res.json({ success: true, data: alert });
});

export const markAllRead = asyncHandler(async (_req, res) => {
  await Alert.updateMany({ isRead: false }, { isRead: true });
  res.json({ success: true, message: 'All alerts marked as read' });
});
