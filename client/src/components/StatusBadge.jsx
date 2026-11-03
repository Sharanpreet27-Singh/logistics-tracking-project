export const STATUS_COLORS = {
  // vehicles
  moving: '#1F9D55', idle: '#5B6B7B', stopped: '#D68A00', offline: '#8A94A0', maintenance: '#D64545',
  // drivers
  available: '#1F9D55', 'on-trip': '#2563EB', 'off-duty': '#8A94A0',
  // shipments
  Created: '#5B6B7B', Assigned: '#7C3AED', 'Picked Up': '#D68A00', 'In Transit': '#2563EB',
  Delivered: '#1F9D55', Failed: '#D64545', Cancelled: '#8A94A0',
  // alerts
  info: '#2563EB', warning: '#D68A00', critical: '#D64545',
};

export default function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || '#5B6B7B';
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{ color, backgroundColor: `${color}1A` }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {status}
    </span>
  );
}
