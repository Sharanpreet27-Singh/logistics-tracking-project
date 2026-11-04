import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Search, ArrowRight, Download, HelpCircle, ChevronDown, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import Modal from '../components/Modal.jsx';
import Spinner from '../components/Spinner.jsx';
import StatusBadge, { STATUS_HELP, STATUS_COLORS } from '../components/StatusBadge.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { CITIES, SHIPMENT_STATUSES, PHONE_PATTERN, PHONE_HELP, formatDateTime, downloadCSV } from '../utils/helpers.js';

// Next steps a dispatcher can take from each status (mirrors the server rules)
const NEXT = {
  Created: ['Cancelled'],
  Assigned: ['Picked Up', 'Cancelled'],
  'Picked Up': ['In Transit', 'Failed'],
  'In Transit': ['Delivered', 'Failed'],
};
const FLOW = ['Created', 'Assigned', 'Picked Up', 'In Transit', 'Delivered'];
const ACTION_LABEL = { 'Picked Up': 'Mark picked up', 'In Transit': 'Start transit', Delivered: 'Mark delivered', Failed: 'Mark failed', Cancelled: 'Cancel' };
const PHONE_RE = new RegExp(`^${PHONE_PATTERN}$`);
const place = (name) => {
  const c = CITIES.find((x) => x.name === name);
  return { address: c.name, lat: c.lat, lng: c.lng };
};
const kg = (n) => `${Number(n).toLocaleString()} kg`;

export default function Shipments() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const canDispatch = ['admin', 'manager', 'dispatcher'].includes(user.role);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true); // first load only
  const [fetching, setFetching] = useState(false); // every later search / filter
  const [search, setSearch] = useState(params.get('search') || '');
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [guide, setGuide] = useState(false);
  const requestNo = useRef(0);

  useEffect(() => setSearch(params.get('search') || ''), [params]);

  const load = useCallback(async () => {
    const mine = ++requestNo.current;
    setFetching(true);
    try {
      const q = new URLSearchParams({ limit: '200' });
      if (search) q.set('search', search);
      if (status) q.set('status', status);
      const { data } = await api.get(`/shipments?${q}`);
      if (mine === requestNo.current) setRows(data.data); // ignore answers to older searches
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      if (mine === requestNo.current) { setLoading(false); setFetching(false); }
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

  const exportCsv = () => downloadCSV('shipments.csv', rows.map((s) => ({
    trackingId: s.trackingId, customer: s.customerName, from: s.pickup.address, to: s.delivery.address, distanceKm: s.distanceKm, weightKg: s.weightKg,
    vehicle: s.vehicle?.registrationNo || '', driver: s.driver?.name || '', status: s.status, eta: s.eta || '', deliveredAt: s.deliveredAt || '',
  })));

  return (
    <div>
      <PageHeader title="Shipments" subtitle="Create a shipment, give it a vehicle and driver, then move it through each step until it is delivered.">
        <button className="btn btn-secondary" onClick={() => setGuide((g) => !g)}><HelpCircle size={16} /> How it works <ChevronDown size={14} className={`transition-transform ${guide ? 'rotate-180' : ''}`} /></button>
        <button className="btn btn-secondary" onClick={exportCsv} disabled={!rows.length}><Download size={16} /> Export CSV</button>
        {canDispatch && <button className="btn btn-dark" onClick={() => setCreating(true)}><Plus size={16} /> New shipment</button>}
      </PageHeader>

      {guide && (
        <div className="card mb-4 p-5">
          <p className="mb-3 text-sm font-semibold">A shipment moves through these steps</p>
          <ol className="grid gap-3 md:grid-cols-5">
            {FLOW.map((st, i) => (
              <li key={st} className="relative rounded-2xl bg-cream p-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: STATUS_COLORS[st] }}>{i + 1}</span>
                <p className="mt-2 text-sm font-semibold">{st}</p>
                <p className="text-xs text-ink-soft">{STATUS_HELP[st]}</p>
              </li>
            ))}
          </ol>
          <p className="help mt-3">A shipment can also end as <strong>Failed</strong> (could not be delivered) or <strong>Cancelled</strong> (stopped before pickup). The buttons in the table only show the steps allowed next.</p>
        </div>
      )}

      <div className="card">
        <div className="card-head">
          <div className="flex items-center gap-2">
            <div className="relative w-80 max-w-full">
              <Search size={16} className="absolute left-4 top-3 text-ink-mute" aria-hidden="true" />
              <input className="input input-pill pl-10" placeholder="Search tracking ID or customer" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search shipments" />
            </div>
            {fetching && !loading && <span className="chip" role="status"><Loader2 size={12} className="animate-spin" /> Searching</span>}
          </div>
          <div className="scroll-x flex gap-1 overflow-x-auto" role="tablist" aria-label="Filter by status">
            {['', ...SHIPMENT_STATUSES].map((st) => (
              <button key={st || 'all'} role="tab" aria-selected={status === st} onClick={() => setStatus(st)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${status === st ? 'bg-ink text-white' : 'bg-cream text-ink-soft hover:text-ink'}`} title={STATUS_HELP[st]}>
                {st || 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className={`overflow-x-auto transition-opacity ${fetching && !loading ? 'opacity-50' : ''}`} aria-busy={fetching}>
          {loading ? <Spinner /> : rows.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="font-semibold">No shipments found</p>
              <p className="mt-1 text-sm text-ink-soft">{search || status ? 'Try a different search or status.' : 'Create a shipment to start dispatching.'}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr>{['Shipment', 'Route', 'Vehicle / driver', 'ETA', 'Status', canDispatch && 'Next step'].filter(Boolean).map((h) => <th key={h} className="th">{h}</th>)}</tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr key={s._id} className="hover:bg-cream/50">
                    <td className="td whitespace-nowrap"><span className="block font-semibold">{s.trackingId}</span><span className="block text-xs text-ink-soft">{s.customerName}</span></td>
                    <td className="td whitespace-nowrap"><span className="block">{s.pickup.address} <ArrowRight size={12} className="inline text-ink-mute" /> {s.delivery.address}</span><span className="block text-xs text-ink-soft">{s.distanceKm} km · {kg(s.weightKg)}</span></td>
                    <td className="td whitespace-nowrap">{s.vehicle ? <><span className="block">{s.vehicle.registrationNo}</span><span className="block text-xs text-ink-soft">{s.driver?.name}</span></> : <span className="text-ink-mute">Not assigned</span>}</td>
                    <td className="td whitespace-nowrap text-ink-soft">{s.status === 'Delivered' ? `Delivered ${formatDateTime(s.deliveredAt)}` : formatDateTime(s.eta)}</td>
                    <td className="td"><StatusBadge status={s.status} /></td>
                    {canDispatch && (
                      <td className="td whitespace-nowrap">
                        <div className="flex gap-1">
                          {['Created', 'Assigned'].includes(s.status) && <button className="btn btn-dark btn-sm" onClick={() => setAssigning(s)}>{s.status === 'Created' ? 'Assign vehicle' : 'Reassign'}</button>}
                          {(NEXT[s.status] || []).map((n) => (
                            <button key={n} className={`btn btn-sm ${n === 'Failed' || n === 'Cancelled' ? 'btn-secondary text-ember' : 'btn-primary'}`} onClick={() => changeStatus(s, n)} title={STATUS_HELP[n]}>{ACTION_LABEL[n]}</button>
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
    const customerName = form.customerName.trim();
    const customerPhone = form.customerPhone.trim();
    if (customerName.length < 2) return toast.error('Customer name must be at least 2 characters');
    if (customerPhone && !PHONE_RE.test(customerPhone)) return toast.error(`Customer phone ${PHONE_HELP.toLowerCase()}`);
    if (form.pickup === form.delivery) return toast.error('Pickup and delivery cities must be different');
    setBusy(true);
    try {
      const { data } = await api.post('/shipments', {
        customerName,
        customerPhone: customerPhone || undefined,
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
    <Modal title="New shipment" subtitle="Distance, ETA and a tracking ID are worked out for you." onClose={onClose} wide>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="cn">Customer name <span className="text-ember">*</span></label><input id="cn" className="input" required minLength={2} maxLength={80} value={form.customerName} onChange={set('customerName')} placeholder="e.g. Sharma Traders" /></div>
        <div><label className="label" htmlFor="cp">Customer phone</label><input id="cp" className="input" type="tel" pattern={PHONE_PATTERN} title={PHONE_HELP} value={form.customerPhone} onChange={set('customerPhone')} placeholder="Optional" /><p className="help mt-1">{PHONE_HELP}</p></div>
        <div><label className="label" htmlFor="pk">Pickup city</label><select id="pk" className="input" value={form.pickup} onChange={set('pickup')}>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select></div>
        <div><label className="label" htmlFor="dl">Delivery city</label><select id="dl" className="input" value={form.delivery} onChange={set('delivery')}>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select></div>
        <div><label className="label" htmlFor="wt">Weight (kg)</label><input id="wt" className="input" type="number" min="0" max="100000" value={form.weightKg} onChange={set('weightKg')} placeholder="0" /><p className="help mt-1">Only vehicles rated for this weight will be offered when assigning</p></div>
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
  const [tooSmall, setTooSmall] = useState(0);
  const [drivers, setDrivers] = useState([]);
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/vehicles?status=idle,stopped&limit=200'), api.get('/drivers?status=available&limit=200')])
      .then(([v, d]) => {
        const current = shipment.vehicle?._id;
        const free = v.data.data.filter((x) => (!x.assignedDriver || x._id === current));
        const fits = free.filter((x) => x.capacityKg >= shipment.weightKg);
        setTooSmall(free.length - fits.length);
        setVehicles(fits);
        setDrivers(d.data.data);
        setVehicleId(fits[0]?._id || '');
        setDriverId(d.data.data[0]?._id || '');
      })
      .catch((e) => toast.error(errorMessage(e)));
  }, [shipment]);

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
    <Modal title={`Assign ${shipment.trackingId}`} subtitle="Only idle vehicles that can carry the load and available drivers are listed." onClose={onClose}>
      {!vehicles ? <Spinner /> : vehicles.length === 0 || drivers.length === 0 ? (
        <p className="rounded-2xl bg-cream p-4 text-sm text-ink-soft">
          {vehicles.length === 0 && tooSmall > 0
            ? `No free vehicle can carry ${kg(shipment.weightKg)}. ${tooSmall} idle vehicle${tooSmall === 1 ? ' is' : 's are'} rated below that.`
            : 'You need at least one idle vehicle and one available driver to assign this shipment. Free one up from the Vehicles or Drivers page.'}
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="rounded-2xl bg-cream p-3 text-sm">{shipment.pickup.address} <ArrowRight size={12} className="inline" /> {shipment.delivery.address} · {shipment.distanceKm} km · {kg(shipment.weightKg)}</p>
          <div>
            <label className="label" htmlFor="av">Vehicle</label>
            <select id="av" className="input" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
              {vehicles.map((v) => <option key={v._id} value={v._id}>{v.registrationNo} ({v.type}, {kg(v.capacityKg)})</option>)}
            </select>
            {tooSmall > 0 && <p className="help mt-1">{tooSmall} idle vehicle{tooSmall === 1 ? '' : 's'} hidden: rated below {kg(shipment.weightKg)}.</p>}
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
