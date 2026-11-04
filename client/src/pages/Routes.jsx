import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../services/api.js';
import MapView from '../components/MapView.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Spinner from '../components/Spinner.jsx';
import PageHeader from '../components/PageHeader.jsx';
import { CITIES, formatDuration } from '../utils/helpers.js';

export default function RoutesPage() {
  const [shipments, setShipments] = useState(null);
  const [selected, setSelected] = useState(null);
  const [startCity, setStartCity] = useState('Panipat');
  const [stopCities, setStopCities] = useState(['Karnal', 'Chandigarh', 'Delhi']);
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    api.get('/shipments?limit=100').then((r) => {
      const active = r.data.data.filter((s) => !['Cancelled'].includes(s.status));
      setShipments(active);
      setSelected(active[0]?._id || null);
    }).catch((e) => toast.error(errorMessage(e)));
  }, []);

  const current = shipments?.find((s) => s._id === selected);
  const mapProps = useMemo(() => {
    if (plan) {
      const pts = [plan.start, ...plan.ordered].map((p) => [p.lat, p.lng]);
      return {
        lines: [{ id: 'plan', positions: pts, color: '#17191D', weight: 4 }],
        pins: [plan.start, ...plan.ordered].map((p, i) => ({ id: `p${i}`, position: [p.lat, p.lng], label: i === 0 ? `Start: ${p.name}` : `${i}. ${p.name}`, color: i === 0 ? '#1F9D55' : '#F7B500', permanent: true })),
        fit: pts,
      };
    }
    if (!current) return { lines: [], pins: [] };
    const a = [current.pickup.lat, current.pickup.lng];
    const b = [current.delivery.lat, current.delivery.lng];
    return {
      lines: [{ id: current._id, positions: [a, b], color: '#E8553F', weight: 4 }],
      pins: [
        { id: 'a', position: a, label: `Pickup: ${current.pickup.address}`, color: '#1F9D55', permanent: true },
        { id: 'b', position: b, label: `Delivery: ${current.delivery.address}`, color: '#E8553F', permanent: true },
      ],
      fit: [a, b],
    };
  }, [current, plan]);

  const toggleStop = (name) => setStopCities((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));
  // A plan belongs to the stops it was made for; changing them clears it.
  useEffect(() => setPlan(null), [startCity, stopCities]);

  const optimize = async () => {
    const start = CITIES.find((c) => c.name === startCity);
    const stops = CITIES.filter((c) => stopCities.includes(c.name) && c.name !== startCity);
    if (!stops.length) return toast.error('Pick at least one stop');
    try {
      const { data } = await api.post('/routes/optimize', { start, stops });
      setPlan(data.data);
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  if (!shipments) return <Spinner />;

  return (
    <div>
      <PageHeader title="Routes" subtitle="See the planned route of any shipment, or plan the shortest order for a multi-stop trip." />
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <section className="card">
            <div className="card-head"><h2 className="card-title">Shipment routes</h2><span className="help">{shipments.length} shipments</span></div>
            <ul className="max-h-80 divide-y divide-line overflow-y-auto">
              {shipments.length === 0 && <li className="p-4 text-sm text-ink-soft">No shipments yet.</li>}
              {shipments.map((s) => (
                <li key={s._id}>
                  <button className={`w-full px-5 py-3 text-left transition-colors hover:bg-cream/60 ${!plan && selected === s._id ? 'bg-sun-soft' : ''}`} onClick={() => { setPlan(null); setSelected(s._id); }}>
                    <div className="flex items-center justify-between gap-2"><span className="font-semibold">{s.pickup.address} <ArrowRight size={12} className="inline text-ink-mute" /> {s.delivery.address}</span><StatusBadge status={s.status} /></div>
                    <p className="mt-0.5 text-xs text-ink-soft">{s.trackingId} · {s.distanceKm} km · about {formatDuration((s.distanceKm / 45) * 60)} driving</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="card p-5">
            <h2 className="card-title mb-1 flex items-center gap-2"><Sparkles size={16} className="text-sun-dark" /> Multi-stop planner</h2>
            <p className="mb-4 text-sm text-ink-soft">Pick where the trip starts and the cities to visit. The planner tries every possible order (up to 8 stops) and keeps the one with the least driving; beyond 8 it uses a fast approximation.</p>
            <label className="label" htmlFor="start">Start from</label>
            <select id="start" className="input mb-4" value={startCity} onChange={(e) => setStartCity(e.target.value)}>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select>
            <fieldset className="mb-4">
              <legend className="label">Stops to visit</legend>
              <div className="flex flex-wrap gap-1.5">
                {CITIES.filter((c) => c.name !== startCity).map((c) => {
                  const on = stopCities.includes(c.name);
                  return (
                    <label key={c.name} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm transition-colors ${on ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink-soft hover:text-ink'}`}>
                      <input type="checkbox" className="sr-only" checked={on} onChange={() => toggleStop(c.name)} />{c.name}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <button className="btn btn-primary w-full" onClick={optimize}>Plan best order</button>
            {plan && (
              <div className="mt-4 rounded-2xl bg-cream p-4 text-sm">
                <ol className="flex flex-wrap items-center gap-1.5 font-semibold">
                  <li className="chip bg-leaf-soft text-leaf">{plan.start.name}</li>
                  {plan.ordered.map((s, i) => <li key={s.name} className="flex items-center gap-1.5"><ArrowRight size={12} className="text-ink-mute" /><span className="chip bg-white">{i + 1}. {s.name}</span></li>)}
                </ol>
                <p className="mt-2 text-ink-soft">{plan.exact ? 'Shortest possible order' : 'Best order found'}: about {plan.totalKm} km and {formatDuration(plan.durationMin)} of driving in total.</p>
              </div>
            )}
          </section>
        </div>

        <div className="card h-[520px] overflow-hidden xl:h-auto xl:min-h-[600px]">
          <MapView {...mapProps} />
        </div>
      </div>
    </div>
  );
}
