import { z } from 'zod';
import { VEHICLE_TYPES, FUEL_TYPES, VEHICLE_STATUSES, DRIVER_STATUSES, SHIPMENT_STATUSES } from '../models/constants.js';

const optionalDate = z.coerce.date().optional();

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const vehicleSchema = z.object({
  registrationNo: z.string().trim().min(3),
  type: z.enum(VEHICLE_TYPES),
  make: z.string().trim().optional(),
  model: z.string().trim().optional(),
  capacityKg: z.coerce.number().positive(),
  fuelType: z.enum(FUEL_TYPES).default('Diesel'),
  status: z.enum(VEHICLE_STATUSES).default('idle'),
  nextServiceDate: optionalDate,
  insuranceExpiry: optionalDate,
});

export const driverSchema = z.object({
  name: z.string().trim().min(2),
  phone: z.string().trim().min(7),
  email: z.string().trim().email().optional(),
  licenseNo: z.string().trim().min(5),
  licenseExpiry: optionalDate,
  status: z.enum(DRIVER_STATUSES).default('available'),
  rating: z.coerce.number().min(0).max(5).default(4),
});

const place = z.object({
  address: z.string().trim().min(2),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const shipmentCreateSchema = z.object({
  customerName: z.string().trim().min(2),
  customerPhone: z.string().trim().optional(),
  pickup: place,
  delivery: place,
  weightKg: z.coerce.number().min(0).default(0),
});

export const assignSchema = z.object({ vehicleId: z.string().min(1), driverId: z.string().min(1) });

export const statusSchema = z.object({
  status: z.enum(SHIPMENT_STATUSES),
  note: z.string().trim().max(300).optional(),
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
