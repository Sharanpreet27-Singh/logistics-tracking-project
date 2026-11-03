import { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../services/api.js';
import Spinner from '../components/Spinner.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { downloadCSV, formatDate } from '../utils/helpers.js';

const pct = (v) => (v == null ? '-' : `${v}%`);

export default function Reports() {
  const [days, setDays] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [range, setRange] = useState(30);

  useEffect(() => {
    const from = new Date(Date.now() - (range - 1) * 86400000).toISOString();
    Promise.all([api.get(`/reports/deliveries?from=${from}`), api.get('/reports/vehicles'), api.get('/reports/drivers')])
      .then(([d, v, dr]) => { setDays(d.data.data); setVehicles(v.data.data); setDrivers(dr.data.data); })
      .catch((e) => toast.error(errorMessage(e)));
  }, [range]);

  if (!days) return <Spinner />;
  const total = days.reduce((s, d) => s + d.deliveries, 0);
  const onTime = days.reduce((s, d) => s + d.onTime, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <h1 className="text-2xl font-bold">Reports</h1>
        <div className="flex gap-2">
          <select className="input w-auto" value={range} onChange={(e) => setRange(Number(e.target.value))} aria-label="Date range">
            <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
          </select>
          <button className="btn btn-secondary" onClick={() => window.print()}><Printer size={16} /> Print / save as PDF</button>
        </div>
      </div>

      <section className="panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Deliveries per day</h2>
            <p className="text-sm text-steel">{total} delivered, {total ? Math.round((onTime / total) * 100) : 0}% on time</p>
          </div>
          <button className="btn btn-secondary print:hidden" onClick={() => downloadCSV('deliveries.csv', days)} disabled={!days.length}><Download size={16} /> CSV</button>
        </div>
        {days.length === 0 ? <p className="py-10 text-center text-sm text-steel">No deliveries in this period.</p> : (
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={days.map((d) => ({ ...d, label: formatDate(d.date).slice(0, 6) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                <Tooltip />
                <Line type="monotone" dataKey="deliveries" name="Deliveries" stroke="#1B2430" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="onTime" name="On time" stroke="#1F9D55" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="panel overflow-x-auto">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-semibold">Vehicle utilization</h2>
          <button className="btn btn-secondary print:hidden" onClick={() => downloadCSV('vehicles.csv', vehicles.map(({ id, ...r }) => r))}><Download size={16} /> CSV</button>
        </div>
        <table className="w-full">
          <thead><tr>{['Vehicle', 'Type', 'Status', 'Shipments', 'Delivered', 'Failed', 'Distance', 'On time'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id}>
                <td className="td font-semibold">{v.registrationNo}</td><td className="td">{v.type}</td><td className="td"><StatusBadge status={v.status} /></td>
                <td className="td">{v.totalShipments}</td><td className="td">{v.delivered}</td><td className="td">{v.failed}</td><td className="td">{v.distanceKm} km</td><td className="td">{pct(v.onTimeRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="panel overflow-x-auto">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-semibold">Driver performance</h2>
          <button className="btn btn-secondary print:hidden" onClick={() => downloadCSV('drivers.csv', drivers.map(({ id, ...r }) => r))}><Download size={16} /> CSV</button>
        </div>
        <table className="w-full">
          <thead><tr>{['Driver', 'Rating', 'Shipments', 'Delivered', 'Failed', 'Distance', 'On time'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {drivers.map((d) => (
              <tr key={d.id}>
                <td className="td font-semibold">{d.name}</td><td className="td">{Number(d.rating).toFixed(1)} / 5</td><td className="td">{d.totalShipments}</td>
                <td className="td">{d.delivered}</td><td className="td">{d.failed}</td><td className="td">{d.distanceKm} km</td><td className="td">{pct(d.onTimeRate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
