import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, _res, next) => next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// Field names as people read them. Anything missing falls back to a de-camel-cased version.
const LABELS = {
  customerName: 'Customer name', customerPhone: 'Customer phone', weightKg: 'Weight', 'pickup.address': 'Pickup city',
  'delivery.address': 'Delivery city', registrationNo: 'Registration number', capacityKg: 'Capacity', fuelType: 'Fuel type',
  nextServiceDate: 'Next service date', insuranceExpiry: 'Insurance expiry', licenseNo: 'License number',
  licenseExpiry: 'License expiry', vehicleId: 'Vehicle', driverId: 'Driver', email: 'Email', password: 'Password',
  name: 'Name', phone: 'Phone', rating: 'Rating', status: 'Status', type: 'Type', make: 'Make', model: 'Model',
  note: 'Note', lat: 'Latitude', lng: 'Longitude', trackingId: 'Tracking ID',
};
const label = (path) =>
  LABELS[path] || LABELS[path.split('.').pop()] ||
  path.split('.').pop().replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** Turns a zod issue into a short phrase that follows the field label. */
function phrase(issue) {
  switch (issue.code) {
    case 'invalid_type':
      return issue.received === 'undefined' || issue.received === 'null' || issue.received === 'nan' ? 'is required' : `must be a ${issue.expected}`;
    case 'too_small':
      if (issue.type === 'string') return issue.minimum <= 1 ? 'is required' : `must be at least ${issue.minimum} characters`;
      if (issue.type === 'array') return `must have at least ${issue.minimum} item${issue.minimum === 1 ? '' : 's'}`;
      return issue.inclusive ? `must be at least ${issue.minimum}` : `must be greater than ${issue.minimum}`;
    case 'too_big':
      if (issue.type === 'string') return `must be at most ${issue.maximum} characters`;
      if (issue.type === 'array') return `must have at most ${issue.maximum} items`;
      return issue.inclusive ? `must be at most ${issue.maximum}` : `must be less than ${issue.maximum}`;
    case 'invalid_string':
      if (issue.validation === 'email') return 'must be a valid email address';
      return issue.message === 'Invalid' ? 'has an invalid format' : issue.message;
    case 'invalid_enum_value':
      return `must be one of: ${issue.options.join(', ')}`;
    case 'invalid_date':
      return 'must be a valid date';
    default:
      return issue.message.charAt(0).toLowerCase() + issue.message.slice(1);
  }
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    const errors = err.issues.map((i) => {
      const field = i.path.join('.');
      return { field, message: `${label(field || 'Value')} ${phrase(i)}` };
    });
    return res.status(400).json({ success: false, message: errors[0]?.message || 'Validation failed', errors });
  }
  if (err.name === 'CastError') return res.status(400).json({ success: false, message: `${label(err.path || 'id')} is not valid` });
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    const value = err.keyValue?.[field];
    return res.status(409).json({ success: false, message: `${label(field)}${value ? ` "${value}"` : ''} is already in use` });
  }
  if (err.name === 'ValidationError') {
    const first = Object.values(err.errors || {})[0];
    return res.status(400).json({ success: false, message: first ? `${label(first.path)} ${first.kind === 'required' ? 'is required' : 'is not valid'}` : 'Validation failed' });
  }

  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    success: false,
    message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    errors: err.errors,
  });
}
