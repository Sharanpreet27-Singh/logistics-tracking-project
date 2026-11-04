import { useEffect, useState } from 'react';
import { Download, Printer, CheckCircle2, Clock, Route as RouteIcon } from 'lucide-react';
import { ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../services/api.js';
import Spinner from '../components/Spinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import DashboardCard from '../components/DashboardCard.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { downloadCSV, formatDate, formatKm } from '../utils/helpers.js';

const pct = (v) => (v == null ? '-' : `${v}%`);

function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-white px-3 py-2 text-xs shadow-float">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((p) => <p key={p.name} className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: p.stroke || p.color }} />{p.name}: <strong>{p.value}</strong></p>)}
    </div>
  );
}

export default function Reports() {
  const [days, setDays] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [range, setRange] = useState(30);

  useEffect(() => {
    // Start at local midnight (range - 1) days ago, so "last 7 days" is the same seven calendar days as the dashboard.
    const start = new Date();
    start.setDate(start.getDate() - (range - 1));
    start.setHours(0, 0, 0, 0);
    const from = start.toISOString();
    Promise.all([api.get(`/reports/deliveries?from=${from}`), api.get('/reports/vehicles'), api.get('/reports/drivers')])
      .then(([d, v, dr]) => { setDays(d.data.data); setVehicles(v.data.data); setDrivers(dr.data.data); })
      .catch((e) => toast.error(errorMessage(e)));
  }, [range]);

  if (!days) return <Spinner label="Building reports" />;
  const total = days.reduce((s, d) => s + d.deliveries, 0);
  const onTime = days.reduce((s, d) => s + d.onTime, 0);
  const km = days.reduce((s, d) => s + d.distanceKm, 0);

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" subtitle="How the fleet performed: deliveries per day, how busy each vehicle was and how each driver did.">
        <select className="input input-pill w-auto print:hidden" value={range} onChange={(e) => setRange(Number(e.target.value))} aria-label="Date range">
          <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
        </select>
        <button className="btn btn-secondary print:hidden" onClick={() => window.print()}><Printer size={16} /> Print / save as PDF</button>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-3">
        <DashboardCard label="Delivered" value={total} hint={`in the last ${range} days`} icon={CheckCircle2} accent="#1F9D55" spark={days.map((d) => d.deliveries)} sparkType="bars" />
        <DashboardCard label="On-time rate" value={total ? `${Math.round((onTime / total) * 100)}%` : '-'} hint={`${onTime} of ${total} arrived before their ETA`} icon={Clock} accent="#F7B500" />
        <DashboardCard label="Distance covered" value={formatKm(km)} hint="by delivered shipments" icon={RouteIcon} accent="#E8553F" spark={days.map((d) => d.distanceKm)} />
      </section>

      <section className="card">
        <div className="card-head">
          <div><h2 className="card-title">Deliveries per day</h2><p className="help">Orange is everything delivered, green is the part that arrived on time</p></div>
          <button className="btn btn-secondary btn-sm print:hidden" onClick={() => downloadCSV('deliveries.csv', days)} disabled={!days.length}><Download size={14} /> CSV</button>
        </div>
        {days.length === 0 ? <p className="py-12 text-center text-sm text-ink-soft">No deliveries in this period.</p> : (
          <div className="h-72 p-4">
            <ResponsiveContainer>
              <ComposedChart data={days.map((d) => ({ ...d, label: formatDate(d.date).slice(0, 6) }))} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillDel" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#E8553F" stopOpacity="0.25" /><stop offset="100%" stopColor="#E8553F" stopOpacity="0" /></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ECE7DE" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6F737B' }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6F737B' }} />
                <Tooltip content={<ChartTip />} />
                <Area type="monotone" dataKey="deliveries" name="Delivered" stroke="#E8553F" strokeWidth={2.5} fill="url(#fillDel)" dot={{ r: 3, fill: '#E8553F', strokeWidth: 0 }} />
                <Line type="monotone" dataKey="onTime" name="On time" stroke="#1F9D55" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="card-head">
          <div><h2 className="card-title">Vehicle utilization</h2><p className="help">Shipments handled by each vehicle, all time</p></div>
          <button className="btn btn-secondary btn-sm print:hidden" onClick={() => downloadCSV('vehicles.csv', vehicles.map(({ id, ...r }) => r))}><Download size={14} /> CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['Vehicle', 'Type', 'Status', 'Shipments', 'Delivered', 'Failed', 'Distance', 'On time'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id} className="hover:bg-cream/50">
                  <td className="td font-semibold">{v.registrationNo}</td><td className="td">{v.type}</td><td className="td"><StatusBadge status={v.status} /></td>
                  <td className="td">{v.totalShipments}</td><td className="td">{v.delivered}</td><td className="td">{v.failed}</td><td className="td">{v.distanceKm} km</td><td className="td"><RateBar value={v.onTimeRate} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="card-head">
          <div><h2 className="card-title">Driver performance</h2><p className="help">Deliveries and on-time record per driver</p></div>
          <button className="btn btn-secondary btn-sm print:hidden" onClick={() => downloadCSV('drivers.csv', drivers.map(({ id, ...r }) => r))}><Download size={14} /> CSV</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{['Driver', 'Rating', 'Shipments', 'Delivered', 'Failed', 'Distance', 'On time'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {drivers.map((d) => (
                <tr key={d.id} className="hover:bg-cream/50">
                  <td className="td font-semibold">{d.name}</td><td className="td">{Number(d.rating).toFixed(1)} / 5</td><td className="td">{d.totalShipments}</td>
                  <td className="td">{d.delivered}</td><td className="td">{d.failed}</td><td className="td">{d.distanceKm} km</td><td className="td"><RateBar value={d.onTimeRate} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function RateBar({ value }) {
  if (value == null) return <span className="text-ink-mute">-</span>;
  return (
    <span className="flex items-center gap-2">
      <span className="h-2 w-20 overflow-hidden rounded-full bg-cream-dark"><span className="block h-full rounded-full" style={{ width: `${value}%`, background: value >= 80 ? '#1F9D55' : value >= 50 ? '#F7B500' : '#E8553F' }} /></span>
      <span className="text-xs font-semibold">{pct(value)}</span>
    </span>
  );
}
