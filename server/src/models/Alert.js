import mongoose from 'mongoose';
import { ALERT_TYPES } from './constants.js';

const alertSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ALERT_TYPES, required: true },
    severity: { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
    message: { type: String, required: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle' },
    shipment: { type: mongoose.Schema.Types.ObjectId, ref: 'Shipment' },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

export const Alert = mongoose.model('Alert', alertSchema);
