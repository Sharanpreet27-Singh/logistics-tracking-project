import { useEffect, useMemo, useState } from 'react';
import { Search, Truck, Clock, Gauge, Route as RouteIcon, CalendarDays, MapPin } from 'lucide-react';
import { useFleetTracking } from '../hooks/useFleetTracking.js';
import MapView from '../components/MapView.jsx';
import StatusBadge, { STATUS_HELP } from '../components/StatusBadge.jsx';
import Spinner from '../components/Spinner.jsx';
import Avatar from '../components/Avatar.jsx';
import Timeline from '../components/Timeline.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { tripProgress, scheduleStatus, formatDuration, formatKm, formatTime, formatDate, timeAgo } from '../utils/helpers.js';

const STATUSES = ['moving', 'booked', 'idle', 'stopped', 'offline', 'maintenance'];
const STEPS = ['Created', 'Assigned', 'Picked Up', 'In Transit', 'Delivered'];

export default function FleetTracking() {
  const { vehicles, shipments, loading, connected } = useFleetTracking();
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);

  const shipmentByVehicle = useMemo(() => Object.fromEntries(shipments.filter((s) => s.vehicle).map((s) => [s.vehicle._id, s])), [shipments]);

  const visible = vehicles.filter(
    (v) => (!status || v.status === status) && (!query || v.registrationNo.toLowerCase().includes(query.toLowerCase()) || v.assignedDriver?.name?.toLowerCase().includes(query.toLowerCase()))
  );

  // Pre-select the first truck that is on a trip so the panel is never empty.
  useEffect(() => {
    if (!selectedId && vehicles.length) setSelectedId((vehicles.find((v) => shipmentByVehicle[v._id]) || vehicles[0])._id);
  }, [vehicles, shipmentByVehicle, selectedId]);

  const selected = vehicles.find((v) => v._id === selectedId) || null;
  const trip = selected ? shipmentByVehicle[selected._id] : null;
  const progress = trip && selected?.location ? tripProgress(selected.location, trip.pickup, trip.delivery) : null;

  const lines = visible
    .filter((v) => shipmentByVehicle[v._id] && v.location)
    .map((v) => {
      const s = shipmentByVehicle[v._id];
      return { id: s._id, dashed: true, color: v._id === selectedId ? '#E8553F' : '#A2A6AE', positions: [[v.location.lat, v.location.lng], [s.delivery.lat, s.delivery.lng]] };
    });
  const pins = Object.values(shipmentByVehicle).map((s) => ({ id: `d-${s._id}`, position: [s.delivery.lat, s.delivery.lng], label: s.delivery.address, color: '#17191D', permanent: s._id === trip?._id }));

  const popup = (v) => {
    const s = shipmentByVehicle[v._id];
    const p = s && v.location ? tripProgress(v.location, s.pickup, s.delivery) : null;
    return (
      <div className="space-y-1 text-sm">
        <p className="text-base font-bold">{v.registrationNo}</p>
        <p className="text-ink-soft">{v.type} · {STATUS_HELP[v.status]}</p>
        <p>Driver: {v.assignedDriver?.name || 'Unassigned'}</p>
        {p && <p>{formatKm(p.remainingKm)} to {s.delivery.address}, about {formatDuration(p.minutesLeft)}</p>}
      </div>
    );
  };

  if (loading) return <Spinner label="Loading the fleet" />;

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Live tracking" subtitle="Every vehicle on the map, updated the moment its GPS reports. Click a truck or a card to see its trip.">
        <span className={`chip ${connected ? 'bg-leaf-soft text-leaf' : 'bg-ember-soft text-ember'}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-leaf' : 'bg-ember'}`} />
          {connected ? 'Live updates on' : 'Reconnecting...'}
        </span>
      </PageHeader>

      <div className="grid gap-4 lg:h-[calc(100vh-11rem)] lg:min-h-[560px] lg:grid-cols-[380px_1fr]">
        {/* Shipping detail panel */}
        <aside className="card order-2 flex min-h-0 flex-col overflow-hidden lg:order-1">
          <div className="card-head"><h2 className="card-title">Shipping detail</h2>{selected && <StatusBadge status={selected.status} />}</div>
          {!selected ? (
            <p className="p-5 text-sm text-ink-soft">Select a vehicle on the map or from the cards below.</p>
          ) : (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex items-center gap-3 p-5">
                <Avatar name={selected.assignedDriver?.name || selected.registrationNo} size={48} />
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{selected.assignedDriver?.name || 'No driver assigned'}</p>
                  <p className="text-xs text-ink-soft">{selected.registrationNo} · {selected.type}{selected.make ? ` · ${selected.make} ${selected.model || ''}` : ''}</p>
                </div>
              </div>

              {trip && progress ? (
                <>
                  <div className="flex flex-wrap gap-1.5 px-5">
                    {trip.status === 'In Transit' ? (
                      <>
                        <span className="chip" title="Based on the truck's current position at an average 55 km/h"><Clock size={12} /> Arrives in {formatDuration(progress.minutesLeft)}</span>
                        <span className="chip"><RouteIcon size={12} /> {formatKm(progress.remainingKm)} to go</span>
                      </>
                    ) : (
                      <span className="chip"><Clock size={12} /> {trip.status === 'Assigned' ? 'Waiting for pickup' : 'Loading at origin'}</span>
                    )}
                    <span className="chip" title="Promised delivery date"><CalendarDays size={12} /> Due {formatDate(trip.eta)}</span>
                    <StatusBadge status={trip.status} />
                  </div>

                  <div className="mx-5 mt-4 space-y-3 rounded-2xl bg-cream p-4">
                    <Stop label="From" place={trip.pickup.address} color="#1F9D55" />
                    <Stop label="To" place={trip.delivery.address} color="#E8553F" last />
                  </div>

                  <div className="px-5 pt-5">
                    <p className="mb-2 text-sm font-semibold">Shipment insights</p>
                    <div className="mb-2 flex gap-3 text-xs text-ink-soft">
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-ember" />Loaded</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-sun" />In transit</span>
                      <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-cream-deep" />Remaining</span>
                    </div>
                    <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-cream-deep" aria-label={`${Math.round(progress.progress * 100)}% of the trip completed`}>
                      <span className="rounded-l-full bg-ember" style={{ width: '12%' }} />
                      <span className="bg-sun" style={{ width: `${Math.max(0, progress.progress * 100 - 12)}%` }} />
                    </div>
                    <dl className="mt-4 divide-y divide-line text-sm">
                      <Row icon={RouteIcon} label="Total distance" value={formatKm(trip.distanceKm)} />
                      <Row icon={Gauge} label="Speed now" value={`${Math.round(selected.speed || 0)} km/h`} />
                      {trip.status === 'In Transit' && <Row icon={MapPin} label="Expected arrival" value={formatTime(Date.now() + progress.minutesLeft * 60000)} />}
                      <Row icon={CalendarDays} label="Promised by" value={trip.eta ? formatTime(trip.eta) : '-'} />
                      {trip.status === 'In Transit' && <Row icon={Clock} label="Against the promise" value={scheduleStatus(trip.eta, progress.minutesLeft).label} good={scheduleStatus(trip.eta, progress.minutesLeft).good} />}
                    </dl>
                  </div>

                  <div className="border-t border-line p-5">
                    <p className="mb-3 text-sm font-semibold">Shipment timeline</p>
                    <Timeline items={tripTimeline(trip)} />
                    <p className="help mt-4">{trip.trackingId} · {trip.customerName}</p>
                  </div>
                </>
              ) : (
                <div className="px-5 pb-5">
                  <div className="rounded-2xl bg-cream p-4 text-sm">
                    <p className="font-semibold">Not on a shipment</p>
                    <p className="mt-1 text-ink-soft">{STATUS_HELP[selected.status]}. Assign it from the Shipments page to see a route here.</p>
                  </div>
                  <dl className="mt-4 divide-y divide-line text-sm">
                    <Row icon={Gauge} label="Speed now" value={`${Math.round(selected.speed || 0)} km/h`} />
                    <Row icon={Clock} label="Last GPS update" value={selected.lastUpdated ? timeAgo(selected.lastUpdated) : 'never'} />
                  </dl>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Map with floating controls and vehicle cards */}
        <div className="card relative order-1 h-[520px] overflow-hidden lg:order-2 lg:h-auto">
          <MapView vehicles={visible} lines={lines} pins={pins} selectedId={selectedId} onSelect={setSelectedId} popup={popup} attribution="bottomleft" />

          <div className="absolute left-3 top-3 z-[1000] flex gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-3 text-ink-mute" aria-hidden="true" />
              <input className="input input-pill w-56 pl-9 shadow-card" placeholder="Plate or driver" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search vehicles" />
            </div>
            <select className="input input-pill w-auto shadow-card" value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div className="scroll-x absolute bottom-8 left-3 right-3 z-[1000] flex gap-3 overflow-x-auto pb-1">
            {visible.length === 0 && <p className="card px-4 py-3 text-sm text-ink-soft">No vehicles match these filters.</p>}
            {visible.map((v) => {
              const s = shipmentByVehicle[v._id];
              const p = s && v.location ? tripProgress(v.location, s.pickup, s.delivery) : null;
              const active = v._id === selectedId;
              return (
                <button key={v._id} onClick={() => setSelectedId(v._id)} className={`card w-64 shrink-0 p-3 text-left transition-shadow hover:shadow-float ${active ? 'ring-2 ring-sun' : ''}`}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sun-soft text-ink"><Truck size={18} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{v.assignedDriver?.name || 'No driver'}</p>
                      <p className="truncate text-xs text-ink-soft">{v.registrationNo} · {v.type}</p>
                    </div>
                    <StatusBadge status={v.status} />
                  </div>
                  <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2 text-xs">
                    <span className="font-semibold">{s ? s.trackingId : 'No shipment'}</span>
                    <span className="text-ink-soft">{p && s.status === 'In Transit' ? `Arrives in ${formatDuration(p.minutesLeft)}` : s ? STATUS_HELP[s.status] : `${Math.round(v.speed || 0)} km/h`}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stop({ label, place, color, last }) {
  return (
    <div className="relative flex items-center gap-3">
      {!last && <span className="absolute left-[5px] top-4 h-6 border-l-2 border-dashed border-ink-mute" aria-hidden="true" />}
      <span className="h-3 w-3 shrink-0 rounded-full border-2 border-white" style={{ background: color, boxShadow: `0 0 0 2px ${color}` }} />
      <div><p className="text-[11px] uppercase tracking-wide text-ink-soft">{label}</p><p className="text-sm font-semibold">{place}</p></div>
    </div>
  );
}

function Row({ icon: Icon, label, value, good }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="flex items-center gap-2 text-ink-soft"><Icon size={15} /> {label}</dt>
      <dd className={`font-semibold ${good === false ? 'text-ember' : good === true ? 'text-leaf' : ''}`}>{value}</dd>
    </div>
  );
}

export function tripTimeline(trip) {
  const reached = STEPS.indexOf(trip.status);
  return STEPS.map((step, i) => {
    const entry = trip.timeline?.find((t) => t.status === step);
    return {
      title: step,
      subtitle: entry?.note || STATUS_HELP[step],
      time: entry ? formatTime(entry.at) : '',
      state: trip.status === 'Delivered' || i < reached ? 'done' : i === reached ? 'current' : 'todo',
    };
  });
}
