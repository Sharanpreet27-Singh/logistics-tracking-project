import CrudPage from '../components/CrudPage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Avatar from '../components/Avatar.jsx';
import { formatDate, PHONE_PATTERN, PHONE_HELP } from '../utils/helpers.js';

const soon = (d) => d && new Date(d) < new Date(Date.now() + 30 * 86400000);

export default function Drivers() {
  return (
    <CrudPage
      title="Drivers"
      subtitle="People who drive the fleet. Only available drivers can be given a shipment."
      noun="Driver"
      endpoint="/drivers"
      filterOptions={['available', 'on-trip', 'off-duty']}
      csvRow={(r) => ({ name: r.name, phone: r.phone, email: r.email || '', licenseNo: r.licenseNo, licenseExpiry: r.licenseExpiry || '', status: r.status, vehicle: r.assignedVehicle?.registrationNo || '', rating: r.rating })}
      columns={[
        { key: 'name', label: 'Driver', nowrap: true, render: (r) => <span className="flex items-center gap-2.5"><Avatar name={r.name} size={30} /><span><span className="block font-semibold">{r.name}</span><span className="block text-xs text-ink-soft">{r.email || r.phone}</span></span></span> },
        { key: 'phone', label: 'Phone', nowrap: true },
        { key: 'licenseNo', label: 'License', nowrap: true, render: (r) => <><span className="block">{r.licenseNo}</span><span className={`block text-xs ${soon(r.licenseExpiry) ? 'font-semibold text-ember' : 'text-ink-soft'}`}>Expires {formatDate(r.licenseExpiry)}</span></> },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        { key: 'vehicle', label: 'Vehicle', nowrap: true, render: (r) => r.assignedVehicle?.registrationNo || <span className="text-ink-mute">None</span> },
        { key: 'rating', label: 'Rating', nowrap: true, render: (r) => <span className="font-semibold">{Number(r.rating).toFixed(1)}<span className="text-ink-mute"> / 5</span></span> },
      ]}
      fields={[
        { name: 'name', label: 'Full name', required: true, placeholder: 'Rajesh Kumar' },
        { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: '9810000001', pattern: PHONE_PATTERN, help: PHONE_HELP },
        { name: 'email', label: 'Email', type: 'email', placeholder: 'Optional' },
        { name: 'licenseNo', label: 'License number', required: true, placeholder: 'HR0620201000' },
        { name: 'licenseExpiry', label: 'License expiry', type: 'date' },
        { name: 'status', label: 'Status', type: 'select', options: ['available', 'on-trip', 'off-duty'], help: 'Off-duty drivers are not offered for shipments' },
        { name: 'rating', label: 'Rating (0-5)', type: 'number' },
      ]}
    />
  );
}
