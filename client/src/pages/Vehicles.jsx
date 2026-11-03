import CrudPage from '../components/CrudPage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDate } from '../utils/helpers.js';

const TYPES = ['Truck', 'Mini Truck', 'Van', 'Trailer', 'Bike'];
const STATUSES = ['moving', 'idle', 'stopped', 'offline', 'maintenance'];

export default function Vehicles() {
  return (
    <CrudPage
      title="Vehicles"
      noun="Vehicle"
      endpoint="/vehicles"
      filterOptions={STATUSES}
      columns={[
        { key: 'registrationNo', label: 'Registration', render: (r) => <span className="font-semibold">{r.registrationNo}</span> },
        { key: 'type', label: 'Type' },
        { key: 'make', label: 'Make / model', render: (r) => [r.make, r.model].filter(Boolean).join(' ') || '-' },
        { key: 'capacityKg', label: 'Capacity', render: (r) => `${r.capacityKg.toLocaleString()} kg` },
        { key: 'fuelType', label: 'Fuel' },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        { key: 'driver', label: 'Driver', render: (r) => r.assignedDriver?.name || '-' },
        { key: 'nextServiceDate', label: 'Next service', render: (r) => formatDate(r.nextServiceDate) },
        { key: 'insuranceExpiry', label: 'Insurance expires', render: (r) => formatDate(r.insuranceExpiry) },
      ]}
      fields={[
        { name: 'registrationNo', label: 'Registration number', required: true },
        { name: 'type', label: 'Vehicle type', type: 'select', options: TYPES },
        { name: 'make', label: 'Make' },
        { name: 'model', label: 'Model' },
        { name: 'capacityKg', label: 'Capacity (kg)', type: 'number', required: true },
        { name: 'fuelType', label: 'Fuel type', type: 'select', options: ['Diesel', 'Petrol', 'CNG', 'Electric'] },
        { name: 'status', label: 'Status', type: 'select', options: ['idle', 'stopped', 'offline', 'maintenance', 'moving'] },
        { name: 'nextServiceDate', label: 'Next service date', type: 'date' },
        { name: 'insuranceExpiry', label: 'Insurance expiry', type: 'date' },
      ]}
    />
  );
}
