import { z } from 'zod';
import { VEHICLE_TYPES, FUEL_TYPES, VEHICLE_STATUSES, DRIVER_STATUSES, SHIPMENT_STATUSES } from '../models/constants.js';

const optionalDate = z.coerce.date().optional();
const blankToUndefined = (v) => (v === '' || v === null ? undefined : v);

// Digits with an optional leading +, allowing spaces, dashes, dots and brackets; 7 to 15 digits in total.
const digitCount = (v) => (v.match(/\d/g) || []).length;
export const phone = z
  .string()
  .trim()
  .refine(
    (v) => /^\+?[0-9][0-9 ().-]{5,24}$/.test(v) && digitCount(v) >= 7 && digitCount(v) <= 15,
    'must be a phone number with 7 to 15 digits (an optional + prefix, spaces and dashes are fine)'
  );

export const loginSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(1),
});

export const vehicleSchema = z.object({
  registrationNo: z.string().trim().min(3).max(20).toUpperCase(),
  type: z.enum(VEHICLE_TYPES),
  make: z.string().trim().max(40).optional(),
  model: z.string().trim().max(40).optional(),
  capacityKg: z.coerce.number().positive().max(100000),
  fuelType: z.enum(FUEL_TYPES).default('Diesel'),
  status: z.enum(VEHICLE_STATUSES).default('idle'),
  nextServiceDate: optionalDate,
  insuranceExpiry: optionalDate,
});

export const driverSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone,
  email: z.preprocess(blankToUndefined, z.string().trim().email().max(254).toLowerCase().optional()),
  licenseNo: z.string().trim().min(5).max(30).toUpperCase(),
  licenseExpiry: optionalDate,
  status: z.enum(DRIVER_STATUSES).default('available'),
  rating: z.coerce.number().min(0).max(5).default(4),
});

const place = z.object({
  address: z.string().trim().min(2).max(120),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const shipmentCreateSchema = z.object({
  customerName: z.string().trim().min(2).max(80),
  customerPhone: z.preprocess(blankToUndefined, phone.optional()),
  pickup: place,
  delivery: place,
  weightKg: z.coerce.number().min(0).max(100000).default(0),
});

export const assignSchema = z.object({ vehicleId: z.string().min(1), driverId: z.string().min(1) });

export const statusSchema = z.object({
  status: z.enum(SHIPMENT_STATUSES),
  note: z.preprocess(blankToUndefined, z.string().trim().max(300).optional()),
});

export const locationSchema = z.object({
  vehicleId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  speed: z.number().min(0).max(250).default(0),
  heading: z.number().min(0).max(360).default(0),
});

export const optimizeSchema = z.object({
  start: z.object({ name: z.string().optional(), lat: z.number(), lng: z.number() }),
  stops: z.array(z.object({ name: z.string().optional(), lat: z.number(), lng: z.number() })).min(1).max(25),
});
