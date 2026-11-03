import { useCallback, useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { CITIES, SHIPMENT_STATUSES, formatDateTime } from '../utils/helpers.js';

// Next steps a dispatcher can take from each status (mirrors the server rules)
const NEXT = {
  Created: ['Cancelled'],
  Assigned: ['Picked Up', 'Cancelled'],
  'Picked Up': ['In Transit', 'Failed'],
  'In Transit': ['Delivered', 'Failed'],
};
const place = (name) => {
  const c = CITIES.find((x) => x.name === name);
  return { address: c.name, lat: c.lat, lng: c.lng };
};

export default function Shipments() {
  const { user } = useAuth();
  const canDispatch = ['admin', 'manager', 'dispatcher'].includes(user.role);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '200' });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      setRows((await api.get(`/shipments?${params}`)).data.data);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const changeStatus = async (s, next) => {
    let note;
    if (next === 'Failed') {
      note = window.prompt('Why did the delivery fail?');
      if (note === null) return;
    }
    if (next === 'Cancelled' && !window.confirm('Cancel this shipment?')) return;
    try {
      await api.patch(`/shipments/${s._id}/status`, { status: next, note: note || undefined });
      toast.success(`${s.trackingId} marked ${next}`);
      load();
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Shipments</h1>
        {canDispatch && <button className="btn btn-primary" onClick={() => setCreating(true)}><Plus size={16} /> New shipment</button>}
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search size={16} className="absolute left-3 top-2.5 text-steel" aria-hidden="true" />
          <input className="input pl-9" placeholder="Search tracking ID or customer" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search shipments" />
        </div>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {SHIPMENT_STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
      </div>

      <div className="panel overflow-x-auto">
        {loading ? <Spinner /> : rows.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-steel">No shipments found. Create a shipment to start dispatching.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr>{['Tracking ID', 'Customer', 'Route', 'Distance', 'Vehicle / driver', 'ETA', 'Status', canDispatch && 'Actions'].filter(Boolean).map((h) => <th key={h} className="th">{h}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s._id} className="hover:bg-concrete/40">
                  <td className="td font-semibold">{s.trackingId}</td>
                  <td className="td">{s.customerName}</td>
                  <td className="td whitespace-nowrap">{s.pickup.address} to {s.delivery.address}</td>
                  <td className="td">{s.distanceKm} km</td>
                  <td className="td">{s.vehicle ? <>{s.vehicle.registrationNo}<br /><span className="text-xs text-steel">{s.driver?.name}</span></> : '-'}</td>
                  <td className="td whitespace-nowrap">{s.status === 'Delivered' ? `Delivered ${formatDateTime(s.deliveredAt)}` : formatDateTime(s.eta)}</td>
                  <td className="td"><StatusBadge status={s.status} /></td>
                  {canDispatch && (
                    <td className="td">
                      <div className="flex flex-wrap gap-1">
                        {['Created', 'Assigned'].includes(s.status) && <button className="btn btn-dark btn-sm" onClick={() => setAssigning(s)}>{s.status === 'Created' ? 'Assign' : 'Reassign'}</button>}
                        {(NEXT[s.status] || []).map((n) => (
                          <button key={n} className={`btn btn-sm ${n === 'Failed' || n === 'Cancelled' ? 'btn-secondary text-stop' : 'btn-primary'}`} onClick={() => changeStatus(s, n)}>{n === 'Cancelled' ? 'Cancel' : n === 'Failed' ? 'Mark failed' : `Mark ${n.toLowerCase()}`}</button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {creating && <CreateModal onClose={() => setCreating(false)} onDone={() => { setCreating(false); load(); }} />}
      {assigning && <AssignModal shipment={assigning} onClose={() => setAssigning(null)} onDone={() => { setAssigning(null); load(); }} />}
    </div>
  );
}

function CreateModal({ onClose, onDone }) {
  const [form, setForm] = useState({ customerName: '', customerPhone: '', pickup: 'Panipat', delivery: 'Delhi', weightKg: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.pickup === form.delivery) return toast.error('Pickup and delivery cities must be different');
    setBusy(true);
    try {
      const { data } = await api.post('/shipments', {
        customerName: form.customerName,
        customerPhone: form.customerPhone || undefined,
        pickup: place(form.pickup),
        delivery: place(form.delivery),
        weightKg: Number(form.weightKg) || 0,
      });
      toast.success(`Shipment ${data.data.trackingId} created`);
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal title="New shipment" onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="cn">Customer name</label><input id="cn" className="input" required value={form.customerName} onChange={set('customerName')} /></div>
        <div><label className="label" htmlFor="cp">Customer phone</label><input id="cp" className="input" value={form.customerPhone} onChange={set('customerPhone')} /></div>
        <div><label className="label" htmlFor="pk">Pickup city</label><select id="pk" className="input" value={form.pickup} onChange={set('pickup')}>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select></div>
        <div><label className="label" htmlFor="dl">Delivery city</label><select id="dl" className="input" value={form.delivery} onChange={set('delivery')}>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select></div>
        <div><label className="label" htmlFor="wt">Weight (kg)</label><input id="wt" className="input" type="number" min="0" value={form.weightKg} onChange={set('weightKg')} /></div>
        <div className="flex items-end justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={busy}>{busy ? 'Creating...' : 'Create shipment'}</button>
        </div>
      </form>
    </Modal>
  );
}

function AssignModal({ shipment, onClose, onDone }) {
  const [vehicles, setVehicles] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/vehicles?status=idle&limit=200'), api.get('/drivers?status=available&limit=200')])
      .then(([v, d]) => {
        const free = v.data.data.filter((x) => !x.assignedDriver);
        setVehicles(free);
        setDrivers(d.data.data);
        setVehicleId(free[0]?._id || '');
        setDriverId(d.data.data[0]?._id || '');
      })
      .catch((e) => toast.error(errorMessage(e)));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.patch(`/shipments/${shipment._id}/assign`, { vehicleId, driverId });
      toast.success('Vehicle and driver assigned');
      onDone();
    } catch (err) {
      toast.error(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Modal title={`Assign ${shipment.trackingId}`} onClose={onClose}>
      {!vehicles ? <Spinner /> : vehicles.length === 0 || drivers.length === 0 ? (
        <p className="text-sm text-steel">You need at least one idle vehicle and one available driver to assign this shipment. Free one up from the Vehicles or Drivers page.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-steel">{shipment.pickup.address} to {shipment.delivery.address}, {shipment.distanceKm} km, {shipment.weightKg} kg</p>
          <div>
            <label className="label" htmlFor="av">Vehicle</label>
            <select id="av" className="input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              {vehicles.map((v) => <option key={v._id} value={v._id}>{v.registrationNo} ({v.type}, {v.capacityKg} kg)</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="ad">Driver</label>
            <select id="ad" className="input" value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              {drivers.map((d) => <option key={d._id} value={d._id}>{d.name} (rating {Number(d.rating).toFixed(1)})</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" disabled={busy}>{busy ? 'Assigning...' : 'Assign'}</button>
          </div>
        </form>
      )}
    </Modal>
  );
}
