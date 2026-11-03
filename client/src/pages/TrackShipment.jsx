import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Truck, Check } from 'lucide-react';
import axios from 'axios';
import StatusBadge from '../components/StatusBadge.jsx';
import { formatDateTime } from '../utils/helpers.js';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';
const STEPS = ['Created', 'Assigned', 'Picked Up', 'In Transit', 'Delivered'];

export default function TrackShipment() {
  const { trackingId } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(trackingId || '');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!trackingId) { setData(null); return; }
    setLoading(true);
    setError('');
    axios.get(`${baseURL}/track/${encodeURIComponent(trackingId)}`)
      .then((r) => setData(r.data.data))
      .catch((e) => { setData(null); setError(e.response?.data?.message || 'Could not load tracking details. Try again in a moment.'); })
      .finally(() => setLoading(false));
  }, [trackingId]);

  const reached = data ? STEPS.indexOf(data.status) : -1;
  const doneAt = (step) => data?.timeline.find((t) => t.status === step)?.at;

  return (
    <div className="min-h-screen bg-concrete">
      <header className="bg-asphalt-900 px-6 py-4 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold"><span className="flex h-8 w-8 items-center justify-center rounded-md bg-lane text-asphalt-950"><Truck size={18} /></span> FleetTrack</Link>
          <Link to="/login" className="text-sm text-white/70 hover:text-white">Staff sign in</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-3xl font-bold">Track your shipment</h1>
        <p className="mb-5 mt-1 text-steel">Enter the tracking ID from your confirmation, for example SHP-20261103-1001.</p>
        <form className="mb-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (input.trim()) navigate(`/track/${input.trim()}`); }}>
          <input className="input" placeholder="Tracking ID" value={input} onChange={(e) => setInput(e.target.value)} aria-label="Tracking ID" />
          <button className="btn btn-dark px-6">Track</button>
        </form>

        {loading && <p className="text-steel">Looking up your shipment...</p>}
        {error && <p role="alert" className="rounded-md bg-stop/10 px-4 py-3 text-stop">{error}</p>}

        {data && (
          <div className="panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div><p className="text-sm text-steel">Tracking ID</p><p className="font-display text-2xl font-bold">{data.trackingId}</p></div>
              <StatusBadge status={data.status} />
            </div>
            <p className="mt-3 text-sm">{data.from} to {data.to} · {data.distanceKm} km</p>
            <p className="text-sm text-steel">{data.status === 'Delivered' ? `Delivered ${formatDateTime(data.deliveredAt)}` : ['Failed', 'Cancelled'].includes(data.status) ? '' : `Expected by ${formatDateTime(data.eta)}`}</p>

            <ol className="mt-6 space-y-4">
              {STEPS.map((step, i) => {
                const done = i <= reached;
                return (
                  <li key={step} className="flex items-start gap-3">
                    <span className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-white ${done ? 'bg-go' : 'bg-concrete-dark'}`}>{done && <Check size={14} />}</span>
                    <div><p className={`font-semibold ${done ? '' : 'text-steel'}`}>{step}</p>{doneAt(step) && <p className="text-xs text-steel">{formatDateTime(doneAt(step))}</p>}</div>
                  </li>
                );
              })}
            </ol>
            {['Failed', 'Cancelled'].includes(data.status) && (
              <p className="mt-5 rounded-md bg-stop/10 px-3 py-2 text-sm text-stop">This shipment was {data.status.toLowerCase()}. Please contact the sender for details.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
