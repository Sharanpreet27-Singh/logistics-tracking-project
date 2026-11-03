import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useFleetTracking } from '../hooks/useFleetTracking.js';
import MapView from '../components/MapView.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Spinner from '../components/Spinner.jsx';
import { haversineKm, formatDuration, timeAgo } from '../utils/helpers.js';

const STATUSES = ['moving', 'idle', 'stopped', 'offline', 'maintenance'];

export default function FleetTracking() {
  const { vehicles, shipments, loading, connected } = useFleetTracking();
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const shipmentByVehicle = useMemo(() => Object.fromEntries(shipments.filter((s) => s.vehicle).map((s) => [s.vehicle._id, s])), [shipments]);

  const visible = vehicles.filter(
    (v) => (!status || v.status === status) && (!query || v.registrationNo.toLowerCase().includes(query.toLowerCase()) || v.assignedDriver?.name?.toLowerCase().includes(query.toLowerCase()))
  );

  const lines = visible
    .filter((v) => shipmentByVehicle[v._id])
    .map((v) => {
      const s = shipmentByVehicle[v._id];
      return { id: s._id, dashed: true, positions: [[v.location.lat, v.location.lng], [s.delivery.lat, s.delivery.lng]] };
    });
  const pins = Object.values(shipmentByVehicle).map((s) => ({ id: `d-${s._id}`, position: [s.delivery.lat, s.delivery.lng], label: `${s.delivery.address} (${s.trackingId})`, color: '#1B2430' }));

  const etaFor = (v) => {
    const s = shipmentByVehicle[v._id];
    if (!s) return null;
    const km = haversineKm(v.location, s.delivery) * 1.25;
    return { km: Math.round(km), minutes: (km / 55) * 60, to: s.delivery.address };
  };

  const popup = (v) => {
    const eta = etaFor(v);
    return (
      <div className="space-y-1 text-sm">
        <p className="text-base font-bold">{v.registrationNo}</p>
        <p>{v.type} · {v.status}</p>
        <p>Driver: {v.assignedDriver?.name || 'Unassigned'}</p>
        <p>Speed: {Math.round(v.speed || 0)} km/h</p>
        {eta && <p>To {eta.to}: {eta.km} km, about {formatDuration(eta.minutes)}</p>}
      </div>
    );
  };

  if (loading) return <Spinner />;

  return (
    <div className="flex h-[calc(100vh-5.5rem)] min-h-[520px] flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Live tracking</h1>
        <span className={`flex items-center gap-2 text-sm ${connected ? 'text-go' : 'text-stop'}`}>
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-go' : 'bg-stop'}`} />
          {connected ? 'Live updates on' : 'Reconnecting...'}
        </span>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="panel flex min-h-0 flex-col">
          <div className="space-y-2 border-b border-concrete-dark p-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-steel" aria-hidden="true" />
              <input className="input pl-9" placeholder="Search plate or driver" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search vehicles" />
            </div>
            <select className="input" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <ul className="min-h-0 flex-1 divide-y divide-concrete overflow-y-auto">
            {visible.length === 0 && <li className="p-4 text-sm text-steel">No vehicles match these filters.</li>}
            {visible.map((v) => {
              const eta = etaFor(v);
              return (
                <li key={v._id}>
                  <button className={`w-full px-3 py-3 text-left hover:bg-concrete/60 ${selectedId === v._id ? 'bg-lane-soft' : ''}`} onClick={() => setSelectedId(v._id)}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{v.registrationNo}</span>
                      <StatusBadge status={v.status} />
                    </div>
                    <p className="mt-1 text-xs text-steel">{v.assignedDriver?.name || 'No driver'} · {Math.round(v.speed || 0)} km/h</p>
                    {eta && <p className="text-xs text-steel">To {eta.to}: {eta.km} km, about {formatDuration(eta.minutes)}</p>}
                    {v.lastUpdated && <p className="text-xs text-steel">Updated {timeAgo(v.lastUpdated)}</p>}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="panel min-h-[320px] overflow-hidden">
          <MapView vehicles={visible} lines={lines} pins={pins} selectedId={selectedId} onSelect={setSelectedId} popup={popup} />
        </div>
      </div>
    </div>
  );
}
