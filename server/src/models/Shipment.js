import mongoose from 'mongoose';
import { SHIPMENT_STATUSES } from './constants.js';

const place = new mongoose.Schema(
  { address: { type: String, required: true }, lat: { type: Number, required: true }, lng: { type: Number, required: true } },
  { _id: false }
);

const shipmentSchema = new mongoose.Schema(
  {
    trackingId: { type: String, required: true, unique: true, index: true },
    customerName: { type: String, required: true, trim: true },
    customerPhone: String,
    pickup: { type: place, required: true },
    delivery: { type: place, required: true },
    weightKg: { type: Number, default: 0 },
    status: { type: String, enum: SHIPMENT_STATUSES, default: 'Created', index: true },
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
    distanceKm: { type: Number, default: 0 },
    eta: Date,
    deliveredAt: Date,
    timeline: [
      new mongoose.Schema(
        { status: String, note: String, at: { type: Date, default: Date.now } },
        { _id: false }
      ),
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export const Shipment = mongoose.model('Shipment', shipmentSchema);
