export const STATUS_COLORS = {
  // vehicles
  moving: '#1F9D55', booked: '#7C3AED', idle: '#6F737B', stopped: '#D68A00', offline: '#A2A6AE', maintenance: '#E8553F',
  // drivers
  available: '#1F9D55', 'on-trip': '#2563EB', 'off-duty': '#A2A6AE',
  // shipments
  Created: '#6F737B', Assigned: '#7C3AED', 'Picked Up': '#D68A00', 'In Transit': '#2563EB',
  Delivered: '#1F9D55', Failed: '#E8553F', Cancelled: '#A2A6AE',
  // alerts
  info: '#2563EB', warning: '#D68A00', critical: '#E8553F',
};

/** One-line, plain-language meaning of each status. Shown as a tooltip and in guides. */
export const STATUS_HELP = {
  Created: 'Waiting for a vehicle and driver',
  Assigned: 'Vehicle booked, pickup pending',
  'Picked Up': 'Parcel collected, leaving the origin',
  'In Transit': 'On the road to the destination',
  Delivered: 'Handed over to the customer',
  Failed: 'Could not be delivered',
  Cancelled: 'Cancelled before delivery',
  moving: 'Driving right now',
  booked: 'Assigned to a shipment, not moving yet',
  idle: 'Parked and free for a trip',
  stopped: 'Stopped on the route',
  offline: 'No GPS signal',
  maintenance: 'In the workshop',
  available: 'Free for a new trip',
  'on-trip': 'Driving a shipment',
  'off-duty': 'Not working today',
  info: 'For your information',
  warning: 'Needs attention soon',
  critical: 'Needs attention now',
};

export default function StatusBadge({ status, size = 'sm' }) {
  const color = STATUS_COLORS[status] || '#6F737B';
  return (
    <span
      title={STATUS_HELP[status]}
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ${size === 'md' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs'}`}
      style={{ color, backgroundColor: `${color}14` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {status}
    </span>
  );
}
