import mongoose from 'mongoose';
import { VEHICLE_TYPES, FUEL_TYPES, VEHICLE_STATUSES } from './constants.js';

const vehicleSchema = new mongoose.Schema(
  {
    registrationNo: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: VEHICLE_TYPES, required: true },
    make: String,
    model: String,
    capacityKg: { type: Number, required: true, min: 1 },
    fuelType: { type: String, enum: FUEL_TYPES, default: 'Diesel' },
    status: { type: String, enum: VEHICLE_STATUSES, default: 'idle', index: true },
    assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver', default: null },
    location: { lat: { type: Number, default: 28.6139 }, lng: { type: Number, default: 77.209 } },
    speed: { type: Number, default: 0 },
    heading: { type: Number, default: 0 },
    lastUpdated: Date,
    nextServiceDate: Date,
    insuranceExpiry: Date,
  },
  { timestamps: true }
);

export const Vehicle = mongoose.model('Vehicle', vehicleSchema);
