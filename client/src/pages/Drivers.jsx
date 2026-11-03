import CrudPage from '../components/CrudPage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDate } from '../utils/helpers.js';

export default function Drivers() {
  return (
    <CrudPage
      title="Drivers"
      noun="Driver"
      endpoint="/drivers"
      filterOptions={['available', 'on-trip', 'off-duty']}
      columns={[
        { key: 'name', label: 'Name', render: (r) => <span className="font-semibold">{r.name}</span> },
        { key: 'phone', label: 'Phone' },
        { key: 'licenseNo', label: 'License no.' },
        { key: 'licenseExpiry', label: 'License expires', render: (r) => formatDate(r.licenseExpiry) },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        { key: 'vehicle', label: 'Vehicle', render: (r) => r.assignedVehicle?.registrationNo || '-' },
        { key: 'rating', label: 'Rating', render: (r) => `${Number(r.rating).toFixed(1)} / 5` },
      ]}
      fields={[
        { name: 'name', label: 'Full name', required: true },
        { name: 'phone', label: 'Phone', required: true },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'licenseNo', label: 'License number', required: true },
        { name: 'licenseExpiry', label: 'License expiry', type: 'date' },
        { name: 'status', label: 'Status', type: 'select', options: ['available', 'on-trip', 'off-duty'] },
        { name: 'rating', label: 'Rating (0-5)', type: 'number' },
      ]}
    />
  );
}
