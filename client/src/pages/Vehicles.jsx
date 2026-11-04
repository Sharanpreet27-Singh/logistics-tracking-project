import CrudPage from '../components/CrudPage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDate } from '../utils/helpers.js';

const TYPES = ['Truck', 'Mini Truck', 'Van', 'Trailer', 'Bike'];
const STATUSES = ['moving', 'booked', 'idle', 'stopped', 'offline', 'maintenance'];
const soon = (d) => d && new Date(d) < new Date(Date.now() + 30 * 86400000);
const Due = ({ label, date }) => (
  <span className={`block whitespace-nowrap text-xs ${soon(date) ? 'font-semibold text-ember' : 'text-ink-soft'}`}>{label} {formatDate(date)}</span>
);

export default function Vehicles() {
  return (
    <CrudPage
      title="Vehicles"
      subtitle="Your fleet. Only idle vehicles can be assigned to a shipment; booked and moving vehicles are already on one."
      noun="Vehicle"
      endpoint="/vehicles"
      filterOptions={STATUSES}
      csvRow={(r) => ({ registrationNo: r.registrationNo, type: r.type, make: r.make || '', model: r.model || '', capacityKg: r.capacityKg, fuelType: r.fuelType, status: r.status, driver: r.assignedDriver?.name || '', nextServiceDate: r.nextServiceDate || '', insuranceExpiry: r.insuranceExpiry || '' })}
      columns={[
        { key: 'registrationNo', label: 'Vehicle', nowrap: true, render: (r) => <><span className="block font-semibold">{r.registrationNo}</span><span className="block text-xs text-ink-soft">{[r.make, r.model].filter(Boolean).join(' ') || r.type}</span></> },
        { key: 'type', label: 'Type', nowrap: true, render: (r) => <><span className="block">{r.type}</span><span className="block text-xs text-ink-soft">{r.fuelType}</span></> },
        { key: 'capacityKg', label: 'Capacity', nowrap: true, render: (r) => `${r.capacityKg.toLocaleString()} kg` },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        { key: 'driver', label: 'Driver', nowrap: true, render: (r) => r.assignedDriver?.name || <span className="text-ink-mute">None</span> },
        { key: 'documents', label: 'Due dates', render: (r) => <><Due label="Service" date={r.nextServiceDate} /><Due label="Insurance" date={r.insuranceExpiry} /></> },
      ]}
      fields={[
        { name: 'registrationNo', label: 'Registration number', required: true, placeholder: 'HR38AB1001' },
        { name: 'type', label: 'Vehicle type', type: 'select', options: TYPES },
        { name: 'make', label: 'Make', placeholder: 'Tata' },
        { name: 'model', label: 'Model', placeholder: 'Prima 4028' },
        { name: 'capacityKg', label: 'Capacity (kg)', type: 'number', required: true, help: 'Maximum load the vehicle can carry; heavier shipments will not be offered this vehicle' },
        { name: 'fuelType', label: 'Fuel type', type: 'select', options: ['Diesel', 'Petrol', 'CNG', 'Electric'] },
        { name: 'status', label: 'Status', type: 'select', options: ['idle', 'stopped', 'offline', 'maintenance'], help: 'Booked and moving are set automatically by shipments. Use maintenance to keep it off new shipments' },
        { name: 'nextServiceDate', label: 'Next service date', type: 'date' },
        { name: 'insuranceExpiry', label: 'Insurance expiry', type: 'date' },
      ]}
    />
  );
}
