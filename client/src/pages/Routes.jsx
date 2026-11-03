import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api, { errorMessage } from '../services/api.js';
import MapView from '../components/MapView.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import Spinner from '../components/Spinner.jsx';
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
        lines: [{ id: 'plan', positions: pts, color: '#1B2430', weight: 4 }],
        pins: [plan.start, ...plan.ordered].map((p, i) => ({ id: `p${i}`, position: [p.lat, p.lng], label: i === 0 ? `Start: ${p.name}` : `${i}. ${p.name}`, color: i === 0 ? '#1F9D55' : '#F2B705', permanent: true })),
        fit: pts,
      };
    }
    if (!current) return { lines: [], pins: [] };
    const a = [current.pickup.lat, current.pickup.lng];
    const b = [current.delivery.lat, current.delivery.lng];
    return {
      lines: [{ id: current._id, positions: [a, b], color: '#2563EB', weight: 4 }],
      pins: [
        { id: 'a', position: a, label: `Pickup: ${current.pickup.address}`, color: '#1F9D55', permanent: true },
        { id: 'b', position: b, label: `Delivery: ${current.delivery.address}`, color: '#D64545', permanent: true },
      ],
      fit: [a, b],
    };
  }, [current, plan]);

  const toggleStop = (name) => setStopCities((s) => (s.includes(name) ? s.filter((x) => x !== name) : [...s, name]));

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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Routes</h1>
      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          <section className="panel">
            <h2 className="border-b border-concrete-dark px-4 py-3 font-semibold">Shipment routes</h2>
            <ul className="max-h-72 divide-y divide-concrete overflow-y-auto">
              {shipments.length === 0 && <li className="p-4 text-sm text-steel">No shipments yet.</li>}
              {shipments.map((s) => (
                <li key={s._id}>
                  <button className={`w-full px-4 py-3 text-left hover:bg-concrete/60 ${!plan && selected === s._id ? 'bg-lane-soft' : ''}`} onClick={() => { setPlan(null); setSelected(s._id); }}>
                    <div className="flex items-center justify-between"><span className="font-semibold">{s.pickup.address} to {s.delivery.address}</span><StatusBadge status={s.status} /></div>
                    <p className="text-xs text-steel">{s.trackingId} · {s.distanceKm} km · about {formatDuration((s.distanceKm / 45) * 60)}</p>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel p-4">
            <h2 className="mb-1 font-semibold">Multi-stop planner</h2>
            <p className="mb-3 text-sm text-steel">Pick a start city and the stops to visit. The planner orders them by nearest next stop.</p>
            <label className="label" htmlFor="start">Start from</label>
            <select id="start" className="input mb-3" value={startCity} onChange={(e) => setStartCity(e.target.value)}>{CITIES.map((c) => <option key={c.name}>{c.name}</option>)}</select>
            <fieldset className="mb-3">
              <legend className="label">Stops</legend>
              <div className="grid grid-cols-2 gap-1">
                {CITIES.filter((c) => c.name !== startCity).map((c) => (
                  <label key={c.name} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={stopCities.includes(c.name)} onChange={() => toggleStop(c.name)} />{c.name}</label>
                ))}
              </div>
            </fieldset>
            <button className="btn btn-dark w-full" onClick={optimize}>Plan best order</button>
            {plan && (
              <div className="mt-4 rounded-md bg-concrete p-3 text-sm">
                <p className="font-semibold">{plan.start.name} {plan.ordered.map((s) => `> ${s.name}`).join(' ')}</p>
                <p className="mt-1 text-steel">About {plan.totalKm} km, {formatDuration(plan.durationMin)} driving</p>
              </div>
            )}
          </section>
        </div>

        <div className="panel h-[520px] overflow-hidden xl:h-auto xl:min-h-[560px]">
          <MapView {...mapProps} />
        </div>
      </div>
    </div>
  );
}
