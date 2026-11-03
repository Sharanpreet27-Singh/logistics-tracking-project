import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Truck, Navigation, PauseCircle, Wrench, Package, Clock, CheckCircle2, Gauge } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';
import api, { errorMessage } from '../services/api.js';
import DashboardCard from '../components/DashboardCard.jsx';
import StatusBadge, { STATUS_COLORS } from '../components/StatusBadge.jsx';
import Spinner from '../components/Spinner.jsx';
import { getSocket } from '../services/socket.js';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

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

  if (error) return <p role="alert" className="panel p-6 text-stop">{error}</p>;
  if (!stats) return <Spinner />;

  const v = stats.vehicles.byStatus;
  const s = stats.shipments.byStatus;
  const ongoing = (s.Assigned || 0) + (s['Picked Up'] || 0) + (s['In Transit'] || 0);
  const pie = Object.entries(s).map(([name, value]) => ({ name, value }));
  const bars = stats.deliveriesPerDay.map((d) => ({ day: format(new Date(d.date), 'EEE d'), Deliveries: d.count }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <section aria-label="Fleet" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Total vehicles" value={stats.vehicles.total} icon={Truck} />
        <DashboardCard label="Moving now" value={v.moving || 0} icon={Navigation} accent="#1F9D55" />
        <DashboardCard label="Idle or stopped" value={(v.idle || 0) + (v.stopped || 0) + (v.offline || 0)} icon={PauseCircle} accent="#5B6B7B" />
        <DashboardCard label="In maintenance" value={v.maintenance || 0} icon={Wrench} accent="#D64545" />
      </section>

      <section aria-label="Shipments" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardCard label="Ongoing shipments" value={ongoing} icon={Package} accent="#2563EB" />
        <DashboardCard label="Waiting for assignment" value={s.Created || 0} icon={Clock} accent="#D68A00" />
        <DashboardCard label="Delivered" value={s.Delivered || 0} icon={CheckCircle2} accent="#1F9D55" hint={stats.onTimeRate == null ? 'No deliveries yet' : `${stats.onTimeRate}% on time`} />
        <DashboardCard label="Fleet utilization" value={`${stats.utilization}%`} icon={Gauge} hint="Vehicles on active shipments" />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="panel p-4 lg:col-span-2">
          <h2 className="mb-3 font-semibold">Deliveries in the last 7 days</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={bars}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
                <Tooltip cursor={{ fill: '#EEF0EC' }} />
                <Bar dataKey="Deliveries" fill="#F2B705" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="panel p-4">
          <h2 className="mb-3 font-semibold">Shipments by status</h2>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>
                  {pie.map((e) => <Cell key={e.name} fill={STATUS_COLORS[e.name] || '#5B6B7B'} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-steel">
            {pie.map((e) => (
              <li key={e.name} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: STATUS_COLORS[e.name] }} />{e.name} ({e.value})
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <div className="flex items-center justify-between px-4 py-3">
          <h2 className="font-semibold">Recent shipments</h2>
          <Link to="/shipments" className="text-sm font-semibold underline">View all</Link>
        </div>
        <table className="w-full">
          <thead><tr>{['Tracking ID', 'Customer', 'Route', 'Vehicle', 'Status'].map((h) => <th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {stats.recent.map((r) => (
              <tr key={r._id}>
                <td className="td font-semibold">{r.trackingId}</td>
                <td className="td">{r.customerName}</td>
                <td className="td">{r.pickup.address} to {r.delivery.address}</td>
                <td className="td">{r.vehicle?.registrationNo || '-'}</td>
                <td className="td"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
