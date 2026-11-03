import mongoose from 'mongoose';
import { DRIVER_STATUSES } from './constants.js';

const driverSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    licenseNo: { type: String, required: true, unique: true, uppercase: true, trim: true },
    licenseExpiry: Date,
    status: { type: String, enum: DRIVER_STATUSES, default: 'available', index: true },
    rating: { type: Number, min: 0, max: 5, default: 4 },
    assignedVehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', default: null },
  },
  { timestamps: true }
);

export const Driver = mongoose.model('Driver', driverSchema);
