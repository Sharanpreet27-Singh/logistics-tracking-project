export const ROLES = ['admin', 'manager', 'dispatcher', 'driver'];
export const VEHICLE_TYPES = ['Truck', 'Mini Truck', 'Van', 'Trailer', 'Bike'];
export const FUEL_TYPES = ['Diesel', 'Petrol', 'CNG', 'Electric'];
// "booked" = assigned to a shipment that has not started moving yet (Assigned / Picked Up).
export const VEHICLE_STATUSES = ['moving', 'booked', 'idle', 'stopped', 'offline', 'maintenance'];
export const DRIVER_STATUSES = ['available', 'on-trip', 'off-duty'];
export const SHIPMENT_STATUSES = ['Created', 'Assigned', 'Picked Up', 'In Transit', 'Delivered', 'Failed', 'Cancelled'];
export const ALERT_TYPES = ['speeding', 'delayed', 'delivery_failed', 'idle', 'maintenance', 'document_expiry'];

// Allowed manual status changes (assignment is done through /assign).
export const TRANSITIONS = {
  Created: ['Cancelled'],
  Assigned: ['Picked Up', 'Cancelled'],
  'Picked Up': ['In Transit', 'Failed'],
  'In Transit': ['Delivered', 'Failed'],
};
export const TERMINAL = ['Delivered', 'Failed', 'Cancelled'];
export const ACTIVE_SHIPMENT = ['Assigned', 'Picked Up', 'In Transit'];
