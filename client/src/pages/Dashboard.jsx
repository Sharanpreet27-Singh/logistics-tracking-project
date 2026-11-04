import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Package, CheckCircle2, Gauge, ArrowRight, Plus, Download, Bell, Activity, PackageCheck, PackageX, Navigation } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import api, { errorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import DashboardCard, { AnimatedNumber } from '../components/DashboardCard.jsx';
import StatusBadge, { STATUS_COLORS, STATUS_HELP } from '../components/StatusBadge.jsx';
import Spinner from '../components/Spinner.jsx';
import MapView from '../components/MapView.jsx';
import Timeline from '../components/Timeline.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { getSocket } from '../services/socket.js';
import { formatDateTime, formatTime, timeAgo, downloadCSV } from '../utils/helpers.js';

const STEPS = ['Created', 'Assigned', 'Picked Up', 'In Transit', 'Delivered'];
const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const ALERT_LABEL = { speeding: 'Speeding', delayed: 'Delayed', delivery_failed: 'Delivery failed', idle: 'Long idle', maintenance: 'Maintenance', document_expiry: 'Document expiry' };

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  // The bar and the line share one series, so show each name once.
  const rows = payload.filter((p, i, arr) => arr.findIndex((x) => x.name === p.name) === i);
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-float">
      <p className="mb-1 font-semibold">{label}</p>
      {rows.map((p, i) => <p key={`${p.name}-${i}`} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: p.stroke || p.color || p.fill }} />{p.name}: <strong>{p.value}</strong></p>)}
    </div>
  );
}

/** Rolling list of what just happened across the fleet, fed by the same socket events the map uses. */
function useActivity(stats) {
  const [items, setItems] = useState([]);
  const plates = useRef({});
  const push = (item) => setItems((list) => [{ id: `${Date.now()}-${Math.random()}`, at: new Date(), ...item }, ...list].slice(0, 8));

  useEffect(() => {
    api.get('/vehicles?limit=200').then((r) => { plates.current = Object.fromEntries(r.data.data.map((v) => [v._id, v.registrationNo])); }).catch(() => {});
    api.get('/alerts?limit=4').then((r) => {
      setItems(r.data.data.map((a) => ({ id: a._id, at: new Date(a.createdAt), kind: 'alert', title: ALERT_LABEL[a.type] || a.type, text: a.message })));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const socket = getSocket();
    const onShipment = (p) => {
      const s = stats?.recent.find((r) => r._id === p.shipmentId);
      const good = p.status === 'Delivered';
      push({ kind: good ? 'delivered' : p.status === 'Failed' ? 'failed' : 'shipment', title: `${s?.trackingId || 'Shipment'} ${p.status.toLowerCase()}`, text: s ? `${s.pickup.address} to ${s.delivery.address}` : STATUS_HELP[p.status] });
    };
    const onAlert = (a) => push({ kind: 'alert', title: ALERT_LABEL[a.type] || a.type, text: a.message });
    const onStatus = (p) => { if (p.status === 'moving') push({ kind: 'moving', title: `${plates.current[p.vehicleId] || 'A vehicle'} started moving`, text: 'GPS reports it has left its stop' }); };
    socket.on('shipment:update', onShipment);
    socket.on('alert:new', onAlert);
    socket.on('vehicle:status', onStatus);
    return () => { socket.off('shipment:update', onShipment); socket.off('alert:new', onAlert); socket.off('vehicle:status', onStatus); };
  }, [stats]);

  return items;
}

const KIND = {
  alert: { icon: Bell, cls: 'bg-ember-soft text-ember' },
  delivered: { icon: PackageCheck, cls: 'bg-leaf-soft text-leaf' },
  failed: { icon: PackageX, cls: 'bg-ember-soft text-ember' },
  shipment: { icon: Package, cls: 'bg-sky-soft text-sky' },
  moving: { icon: Navigation, cls: 'bg-sun-soft text-sun-dark' },
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');
  const activity = useActivity(stats);

  useEffect(() => {
    const load = () => api.get('/dashboard/stats').then((r) => setStats(r.data.data)).catch((e) => setError(errorMessage(e)));
    load();
    const socket = getSocket();
    socket.on('shipment:update', load);
    socket.on('vehicle:status', load);
    return () => {
      socket.off('shipment:update', load);
      socket.off('vehicle:status', load);
    };
  }, []);

  const featured = useMemo(() => stats?.recent.find((s) => s.status === 'In Transit' && s.vehicle?.location) || stats?.recent[0], [stats]);

  if (error) return <p role="alert" className="card p-6 text-ember">{error}</p>;
  if (!stats) return <Spinner />;

  const v = stats.vehicles.byStatus;
  const s = stats.shipments.byStatus;
  const ongoing = (s.Assigned || 0) + (s['Picked Up'] || 0) + (s['In Transit'] || 0);
  const perDay = stats.deliveriesPerDay.map((d) => d.count);
  const weekTotal = perDay.reduce((a, b) => a + b, 0);
  const bars = stats.deliveriesPerDay.map((d) => ({ day: format(new Date(d.date), 'EEE d'), Deliveries: d.count }));
  const fleetMix = ['moving', 'booked', 'idle', 'stopped', 'offline', 'maintenance'].map((k) => ({ name: k, value: v[k] || 0 })).filter((x) => x.value);
  const shipmentMix = Object.entries(s).map(([name, value]) => ({ name, value }));

  // Featured shipment card data
  const reached = featured ? STEPS.indexOf(featured.status) : -1;
  const timeline = featured ? STEPS.map((step, i) => {
    const entry = featured.timeline?.find((t) => t.status === step);
    return { title: step, subtitle: STATUS_HELP[step], time: entry ? formatTime(entry.at) : step === 'Delivered' && featured.eta ? `Est. ${formatDateTime(featured.eta)}` : '', state: i < reached || featured.status === 'Delivered' ? 'done' : i === reached ? 'current' : 'todo' };
  }) : [];
  const mapVehicles = featured?.vehicle?.location && !['Delivered', 'Failed', 'Cancelled'].includes(featured.status) ? [featured.vehicle] : [];
  const mapPins = featured ? [
    { id: 'a', position: [featured.pickup.lat, featured.pickup.lng], color: '#1F9D55' },
    { id: 'b', position: [featured.delivery.lat, featured.delivery.lng], color: '#E8553F' },
  ] : [];
  const mapLines = featured ? [{ id: 'r', positions: [mapVehicles[0] ? [mapVehicles[0].location.lat, mapVehicles[0].location.lng] : [featured.pickup.lat, featured.pickup.lng], [featured.delivery.lat, featured.delivery.lng]], dashed: true }] : [];

  return (
    <div className="space-y-6">
      <PageHeader title={`${greeting()}, ${user.name.split(' ')[0]}`} subtitle="Here is what your fleet is doing right now. Numbers update live as trucks move and shipments change.">
        <Link to="/tracking" className="btn btn-secondary"><Navigation size={16} /> Live map</Link>
        <Link to="/shipments?new=1" className="btn btn-dark"><Plus size={16} /> New shipment</Link>
      </PageHeader>

      <section aria-label="Key numbers" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Vehicles moving" value={<><AnimatedNumber value={v.moving || 0} /> <span className="text-ink-mute">/ {stats.vehicles.total}</span></>} hint={`${stats.utilization}% of the fleet is on a trip`} icon={Truck} accent="#1F9D55" spark={fleetMix.map((x) => x.value)} sparkType="bars" />
        <DashboardCard label="Ongoing shipments" value={<AnimatedNumber value={ongoing} />} hint={`${s.Created || 0} waiting for a vehicle`} icon={Package} accent="#2563EB" spark={perDay} />
        <DashboardCard label="Delivered this week" value={<AnimatedNumber value={weekTotal} />} delta={perDay.at(-1) ? `+${perDay.at(-1)} today` : undefined} hint="in the last 7 days, today included" icon={CheckCircle2} accent="#E8553F" spark={perDay} sparkType="bars" />
        <DashboardCard label="On-time rate" value={stats.onTimeRate == null ? '-' : <><AnimatedNumber value={stats.onTimeRate} />%</>} hint="of deliveries arrived by the promised time" icon={Gauge} accent="#F7B500">
          {stats.onTimeRate != null && (
            <div className="mt-3 flex gap-1" aria-hidden="true">
              <span className="h-2 rounded-full bg-leaf transition-all duration-700" style={{ width: `${stats.onTimeRate}%` }} />
              <span className="h-2 flex-1 rounded-full bg-ember-soft" />
            </div>
          )}
        </DashboardCard>
      </section>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="card-head">
            <div>
              <h2 className="card-title">Delivery analysis</h2>
              <p className="help">How many shipments were delivered each day</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="chip"><span className="h-2 w-2 rounded-full bg-ember" /> Delivered</span>
              <span className="chip">Last 7 days</span>
            </div>
          </div>
          <div className="h-72 p-4">
            <ResponsiveContainer>
              <ComposedChart data={bars} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECE7DE" />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6F737B' }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6F737B' }} />
                <Tooltip content={<ChartTip />} cursor={{ fill: '#F6F2EB' }} />
                <Bar dataKey="Deliveries" fill="#FDEAE6" radius={[6, 6, 0, 0]} />
                <Line type="monotone" dataKey="Deliveries" stroke="#E8553F" strokeWidth={2.5} dot={{ r: 3, fill: '#E8553F', strokeWidth: 0 }} activeDot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="grid gap-4 border-t border-line p-5 md:grid-cols-2">
            <MixBar title="Fleet status" rows={fleetMix} />
            <MixBar title="Shipments by status" rows={shipmentMix} />
          </div>
        </div>

        <div className="card flex flex-col">
          <div className="h-52 overflow-hidden rounded-t-2xl">
            {featured ? <MapView vehicles={mapVehicles} pins={mapPins} lines={mapLines} fit={mapPins.map((p) => p.position)} interactive={false} popup={false} /> : <div className="flex h-full items-center justify-center text-sm text-ink-soft">No shipments yet</div>}
          </div>
          {featured && (
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="help">{featured.status === 'In Transit' ? 'On the road now' : 'Latest shipment'}</p>
                  <p className="font-display text-lg font-bold">{featured.trackingId}</p>
                </div>
                <StatusBadge status={featured.status} />
              </div>
              <p className="mt-1 text-sm text-ink-soft">{featured.pickup.address} <ArrowRight size={12} className="inline" /> {featured.delivery.address} · {featured.vehicle?.registrationNo || 'no vehicle yet'}</p>
              <div className="mt-5"><Timeline items={timeline} /></div>
              <Link to="/tracking" className="btn btn-secondary mt-auto w-full">Open live tracking</Link>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="card xl:col-span-2">
          <div className="card-head">
            <div>
              <h2 className="card-title">Recent shipments</h2>
              <p className="help">The latest six shipments created</p>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" onClick={() => downloadCSV('recent-shipments.csv', stats.recent.map((r) => ({ trackingId: r.trackingId, customer: r.customerName, from: r.pickup.address, to: r.delivery.address, vehicle: r.vehicle?.registrationNo || '', status: r.status })))}><Download size={14} /> Export CSV</button>
              <Link to="/shipments" className="btn btn-dark btn-sm">View all</Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr>{['Tracking ID', 'Customer', 'Route', 'Vehicle', 'ETA', 'Status'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
              <tbody>
                {stats.recent.map((r) => (
                  <tr key={r._id} className="hover:bg-cream/50">
                    <td className="td font-semibold">{r.trackingId}</td>
                    <td className="td">{r.customerName}</td>
                    <td className="td whitespace-nowrap">{r.pickup.address} <ArrowRight size={12} className="inline text-ink-mute" /> {r.delivery.address}</td>
                    <td className="td">{r.vehicle?.registrationNo || <span className="text-ink-mute">Not assigned</span>}</td>
                    <td className="td whitespace-nowrap text-ink-soft">{r.status === 'Delivered' ? formatDateTime(r.deliveredAt) : formatDateTime(r.eta)}</td>
                    <td className="td"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card flex flex-col">
          <div className="card-head">
            <div>
              <h2 className="card-title flex items-center gap-2"><Activity size={16} className="text-ember" /> Live activity</h2>
              <p className="help">Deliveries, departures and alerts as they happen</p>
            </div>
            <span className="chip bg-leaf-soft text-leaf"><span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-leaf opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-leaf" /></span> Live</span>
          </div>
          {activity.length === 0 ? (
            <p className="p-5 text-sm text-ink-soft">Nothing yet. Events appear here the moment a truck moves or a shipment changes.</p>
          ) : (
            <ul className="flex-1 divide-y divide-line">
              {activity.map((a) => {
                const k = KIND[a.kind] || KIND.shipment;
                const Icon = k.icon;
                return (
                  <li key={a.id} className="flex items-start gap-3 px-5 py-3 animate-[fade-in_.4s_ease-out]">
                    <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${k.cls}`}><Icon size={15} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{a.title}</p>
                      <p className="truncate text-xs text-ink-soft">{a.text}</p>
                    </div>
                    <span className="shrink-0 text-[11px] text-ink-mute">{timeAgo(a.at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
          <Link to="/alerts" className="m-5 mt-auto btn btn-secondary btn-sm">See all alerts</Link>
        </div>
      </div>
    </div>
  );
}

/** Horizontal stacked bar + legend; easier to read than a pie. */
function MixBar({ title, rows }) {
  const total = rows.reduce((a, r) => a + r.value, 0) || 1;
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">{title}</p>
      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-cream" aria-hidden="true">
        {rows.map((r) => <span key={r.name} className="transition-all duration-700" style={{ width: `${(r.value / total) * 100}%`, background: STATUS_COLORS[r.name] }} />)}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft">
        {rows.map((r) => <li key={r.name} className="flex items-center gap-1.5" title={STATUS_HELP[r.name]}><span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[r.name] }} />{r.name} <strong className="text-ink">{r.value}</strong></li>)}
      </ul>
    </div>
  );
}
