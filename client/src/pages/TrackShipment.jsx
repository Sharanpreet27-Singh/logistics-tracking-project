import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Truck, Check, Search, ArrowRight, Package, CalendarDays, MapPin } from 'lucide-react';
import axios from 'axios';
import StatusBadge, { STATUS_HELP } from '../components/StatusBadge.jsx';
import MapView from '../components/MapView.jsx';
import Avatar from '../components/Avatar.jsx';
import Timeline from '../components/Timeline.jsx';
import { formatDateTime, formatDate, formatTime } from '../utils/helpers.js';
import { useAuth } from '../context/AuthContext.jsx';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const STEPS = ['Created', 'Assigned', 'Picked Up', 'In Transit', 'Delivered'];
const SHORT = { Created: 'Booked', Assigned: 'Assigned', 'Picked Up': 'Picked up', 'In Transit': 'On the way', Delivered: 'Delivered' };

export default function TrackShipment() {
  const { trackingId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [input, setInput] = useState(trackingId || '');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!trackingId) { setData(null); return; }
    let timer;
    const fetchIt = () => {
      axios.get(`${baseURL}/track/${encodeURIComponent(trackingId)}`)
        .then((r) => { setData(r.data.data); setError(''); })
        .catch((e) => { setData(null); setError(e.response?.data?.message || 'Could not load tracking details. Try again in a moment.'); })
        .finally(() => setLoading(false));
    };
    setLoading(true);
    setError('');
    fetchIt();
    timer = setInterval(fetchIt, 15000); // keep the public page fresh without a login
    return () => clearInterval(timer);
  }, [trackingId]);

  const reached = data ? STEPS.indexOf(data.status) : -1;
  const ended = data && ['Failed', 'Cancelled'].includes(data.status);
  const timeline = data ? STEPS.map((step, i) => {
    const entry = data.timeline.find((t) => t.status === step);
    return { title: step, subtitle: entry?.note || STATUS_HELP[step], time: entry ? formatDateTime(entry.at) : '', state: data.status === 'Delivered' || i < reached ? 'done' : i === reached ? 'current' : 'todo' };
  }) : [];
  const pins = data ? [
    { id: 'a', position: [data.pickup.lat, data.pickup.lng], label: data.pickup.address, color: '#1F9D55', permanent: true },
    { id: 'b', position: [data.delivery.lat, data.delivery.lng], label: data.delivery.address, color: '#E8553F', permanent: true },
  ] : [];
  const vehicles = data?.vehicleLocation ? [{ _id: 'live', registrationNo: data.vehicle?.registrationNo || 'Vehicle', status: 'moving', location: data.vehicleLocation }] : [];
  const lines = data ? [{ id: 'r', dashed: true, positions: [vehicles[0] ? [vehicles[0].location.lat, vehicles[0].location.lng] : [data.pickup.lat, data.pickup.lng], [data.delivery.lat, data.delivery.lng]] }] : [];

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-line bg-white/70 px-6 py-4 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sun text-ink"><Truck size={18} /></span> FleetTrack</Link>
          {user ? <Link to="/" className="btn btn-secondary btn-sm">Back to dashboard</Link> : <Link to="/login" className="btn btn-secondary btn-sm">Staff sign in</Link>}
        </div>
      </header>

      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-3xl font-bold">Smart tracking</h1>
        <p className="mb-5 mt-1 text-ink-soft">Enter the tracking ID from your confirmation, for example SHP-20261104-7K3QX2. No account needed.</p>
        <form className="mb-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); const id = input.trim(); if (!id) { setError('Type the tracking ID from your confirmation first.'); return; } setError(''); navigate(`/track/${id}`); }}>
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-3.5 text-ink-mute" aria-hidden="true" />
            <input className="input input-pill py-3 pl-10" placeholder="Tracking ID" value={input} onChange={(e) => setInput(e.target.value)} aria-label="Tracking ID" />
          </div>
          <button className="btn btn-dark px-6">Track</button>
        </form>

        {loading && !data && <p className="text-ink-soft">Looking up your shipment...</p>}
        {error && <p role="alert" className="rounded-2xl bg-ember-soft px-4 py-3 text-ember">{error}</p>}

        {data && (
          <div className="card overflow-hidden">
            <div className="h-64">
              <MapView vehicles={vehicles} pins={pins} lines={lines} fit={pins.map((p) => p.position)} interactive={false} popup={false} />
            </div>

            <div className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><p className="help">Tracking ID</p><p className="font-display text-2xl font-bold">{data.trackingId}</p></div>
                <StatusBadge status={data.status} size="md" />
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {data.status === 'Delivered' ? `Delivered ${formatDateTime(data.deliveredAt)}` : ended ? STATUS_HELP[data.status] : `Expected by ${formatDateTime(data.eta)}`}
              </p>

              {/* Step strip with truck icons, like the mobile reference */}
              <ol className="mt-5 flex items-center" aria-label="Progress">
                {STEPS.map((step, i) => {
                  const done = data.status === 'Delivered' || i < reached;
                  const current = i === reached && data.status !== 'Delivered';
                  return (
                    <li key={step} className={`flex items-center ${i < STEPS.length - 1 ? 'flex-1' : ''}`}>
                      <div className="flex flex-col items-center">
                        <span className={`flex h-9 w-9 items-center justify-center rounded-full border-2 ${done ? 'border-ink bg-ink text-white' : current ? 'border-sun bg-sun text-ink' : 'border-line bg-white text-ink-mute'}`} title={STATUS_HELP[step]}>
                          {done ? <Check size={16} strokeWidth={3} /> : i === STEPS.length - 1 ? <MapPin size={15} /> : <Truck size={15} />}
                        </span>
                        <span className={`mt-1.5 text-[11px] font-medium ${done || current ? 'text-ink' : 'text-ink-mute'}`}>{SHORT[step]}</span>
                      </div>
                      {i < STEPS.length - 1 && <span className={`mx-1 mb-5 h-0 flex-1 border-t-2 border-dashed ${done ? 'border-ink' : 'border-line'}`} aria-hidden="true" />}
                    </li>
                  );
                })}
              </ol>
            </div>

            {(data.driverName || data.vehicle) && (
              <div className="mx-5 flex items-center gap-3 rounded-2xl bg-cream p-4">
                <Avatar name={data.driverName || data.vehicle?.registrationNo || ''} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{data.driverName ? `${data.driverName} is your driver` : 'Driver to be confirmed'}</p>
                  <p className="text-xs text-ink-soft">{data.vehicle ? `${data.vehicle.type} · ${data.vehicle.registrationNo}` : 'Vehicle not assigned yet'}</p>
                </div>
                {data.vehicleLocation && <span className="chip bg-leaf-soft text-leaf"><span className="h-1.5 w-1.5 rounded-full bg-leaf" /> Live</span>}
              </div>
            )}

            <dl className="m-5 grid grid-cols-2 gap-4 rounded-2xl border border-line p-4 text-sm">
              <div><dt className="help">From</dt><dd className="font-semibold">{data.from}</dd></div>
              <div className="text-right"><dt className="help">To</dt><dd className="font-semibold">{data.to}</dd></div>
              <div><dt className="help flex items-center gap-1"><Package size={12} /> Weight</dt><dd className="font-semibold">{data.weightKg} kg · {data.distanceKm} km</dd></div>
              <div className="text-right"><dt className="help flex items-center justify-end gap-1"><CalendarDays size={12} /> {data.status === 'Delivered' ? 'Delivered' : 'Expected'}</dt><dd className="font-semibold">{formatDate(data.status === 'Delivered' ? data.deliveredAt : data.eta)}{data.status !== 'Delivered' && data.eta ? `, ${formatTime(data.eta)}` : ''}</dd></div>
            </dl>

            <div className="border-t border-line p-5">
              <p className="mb-3 text-sm font-semibold">Shipment timeline</p>
              <Timeline items={timeline} />
              {ended && <p className="mt-5 rounded-2xl bg-ember-soft px-4 py-3 text-sm text-ember">This shipment was {data.status.toLowerCase()}. Please contact the sender for details.</p>}
            </div>
          </div>
        )}

        {!trackingId && !error && (
          <div className="card p-6 text-sm text-ink-soft">
            <p className="font-semibold text-ink">How it works</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Type the tracking ID you received and press Track.</li>
              <li>See where your parcel is on the map and which step it is at.</li>
              <li>The page refreshes itself while the parcel is on the way <ArrowRight size={12} className="inline" /> no need to reload.</li>
            </ol>
          </div>
        )}
      </main>
    </div>
  );
}
