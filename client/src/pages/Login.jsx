import { useState } from 'react';
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { Truck, Mail, Lock, Eye, EyeOff, ArrowRight, Trash2, Plus, Minus, Move, Package, ChevronDown, ChevronLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../services/api.js';
import Avatar from '../components/Avatar.jsx';

const DEMO = [
  { label: 'Admin', name: 'Admin User', email: 'admin@fleet.com', password: 'Admin@123', note: 'Full access' },
  { label: 'Manager', name: 'Fleet Manager', email: 'manager@fleet.com', password: 'Manager@123', note: 'Fleet + reports' },
  { label: 'Dispatcher', name: 'Dispatch Desk', email: 'dispatcher@fleet.com', password: 'Dispatch@123', note: 'Fleet + reports' },
];

const LIME = '#C9F55B';
const VIOLET = '#7C3AED';

/* ---------- Decorative "load planning" scene, modelled on the reference mock-up ---------- */

function Wheel({ cx, cy = 240, r = 30 }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#1F2227" />
      <circle cx={cx} cy={cy} r={r * 0.6} fill="#C9CDD5" />
      <circle cx={cx} cy={cy} r={r * 0.22} fill="#6B7280" />
    </g>
  );
}

/** Side-view semi truck, facing left. Pure SVG so it needs no image asset. */
function TruckSvg({ className = '' }) {
  return (
    <svg viewBox="0 0 900 290" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="tr-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" /><stop offset="1" stopColor="#E6E8EE" /></linearGradient>
        <linearGradient id="tr-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#262A31" /><stop offset="1" stopColor="#4B5160" /></linearGradient>
      </defs>
      <ellipse cx="470" cy="272" rx="430" ry="12" fill="#0F172A" opacity=".08" />
      {/* trailer */}
      <rect x="312" y="36" width="570" height="188" rx="10" fill="url(#tr-body)" stroke="#D3D7DE" strokeWidth="2" />
      <rect x="312" y="36" width="570" height="8" rx="4" fill="#D3D7DE" />
      <rect x="330" y="224" width="540" height="12" rx="3" fill="#3A3E46" />
      <rect x="404" y="236" width="8" height="22" fill="#6B7280" /><rect x="424" y="236" width="8" height="22" fill="#6B7280" />
      <path d="M690 236h156a8 8 0 0 1 8 8v4H682v-4a8 8 0 0 1 8-8z" fill="#2F333B" />
      <Wheel cx={724} /><Wheel cx={802} />
      {/* tractor */}
      <path d="M120 224V128c0-10 6-20 16-26l36-22c8-5 16-8 26-8h100c8 0 14 6 14 14v138z" fill="url(#tr-body)" stroke="#D3D7DE" strokeWidth="2" />
      <path d="M200 72l18-30c4-6 10-8 18-8h66c6 0 10 4 10 10v28z" fill="#F3F4F7" stroke="#D3D7DE" strokeWidth="2" />
      <path d="M46 224v-58c0-8 4-14 12-16l62-20v94z" fill="url(#tr-body)" stroke="#D3D7DE" strokeWidth="2" />
      <path d="M140 128l34-30c4-3 8-4 12-4h40v60h-86z" fill="url(#tr-glass)" />
      <path d="M236 92v132" stroke="#D3D7DE" strokeWidth="2" />
      <rect x="128" y="100" width="8" height="26" rx="2" fill="#2F333B" />
      <rect x="40" y="194" width="24" height="36" rx="4" fill="#D3D7DE" />
      <rect x="48" y="174" width="14" height="10" rx="2" fill="#F7B500" />
      <rect x="34" y="226" width="300" height="12" rx="4" fill="#3A3E46" />
      <rect x="300" y="60" width="8" height="160" rx="3" fill="#9CA3AF" />
      <rect x="180" y="206" width="110" height="26" rx="12" fill="#C7CBD3" />
      <Wheel cx={110} /><Wheel cx={262} /><Wheel cx={330} />
    </svg>
  );
}

const PALLETS = [
  'card', 'plus', 'card', 'card', 'plus',
  'card', 'plus', 'card', 'card', 'card',
  'card', 'card', 'active', 'plus', 'card',
];

function Pallet({ kind }) {
  if (kind === 'plus') {
    return <div className="flex items-center justify-center rounded-lg border border-dashed border-[#D3D7DE] bg-white/40"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-ink-soft shadow-card"><Plus size={11} /></span></div>;
  }
  const active = kind === 'active';
  return (
    <div className={`flex flex-col justify-between rounded-lg border bg-white/95 p-1.5 text-[8px] leading-tight ${active ? 'border-[#7C3AED] shadow-[0_0_0_3px_rgba(124,58,237,.15)]' : 'border-[#DADDE4]'}`}>
      <div className="flex items-start justify-between"><b className="text-[9px]">B2R</b><span className="text-ink-soft">500 kg</span></div>
      {active ? <span className="mx-auto flex h-4 w-4 items-center justify-center rounded-full text-white" style={{ background: VIOLET }}><Plus size={10} /></span> : <span className="text-ink-soft">2-NYK-LDN</span>}
    </div>
  );
}

function Stat({ label, value, delta, tone }) {
  const chip = tone === 'lime' ? { background: LIME, color: '#17191D' } : { background: VIOLET, color: '#fff' };
  return (
    <div>
      <p className="text-xs text-ink-soft">{label}</p>
      <p className="mt-0.5 flex items-center gap-2 whitespace-nowrap font-display text-2xl font-semibold leading-none">{value}<span className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={chip}>{delta}</span></p>
    </div>
  );
}

function ShipmentCard({ id, active }) {
  return (
    <div className={`flex min-w-[185px] shrink-0 items-center gap-3 whitespace-nowrap rounded-2xl bg-white px-3.5 py-2.5 ${active ? 'border border-[#7C3AED] shadow-float' : 'border border-[#E6E8EE] shadow-card'}`}>
      <div><p className="text-[9px] text-ink-soft">Shipment number</p><p className="text-[11px] font-semibold">{id}</p></div>
      <TruckSvg className="h-6 w-auto shrink-0" />
    </div>
  );
}

function LoadScene() {
  return (
    <div className="relative select-none [transform:perspective(1600px)_rotateY(-7deg)_rotateX(3deg)] [transform-origin:60%_50%]" aria-hidden="true">
      {/* stats */}
      <div className="ml-[40%] flex gap-10">
        <Stat label="Weight" value="7,340 kg" delta="+33%" tone="lime" />
        <Stat label="Pallets" value="120" delta="+15%" tone="lime" />
        <Stat label="Alerts" value="62" delta="-22%" tone="violet" />
      </div>

      <div className="relative mt-3 pl-12">
        {/* zoom pill */}
        <div className="absolute left-0 top-[42%] flex flex-col overflow-hidden rounded-full bg-white shadow-card">
          <span className="flex h-8 w-8 items-center justify-center text-ink"><Plus size={13} /></span>
          <span className="flex h-8 w-8 items-center justify-center border-t border-line text-ink"><Minus size={13} /></span>
        </div>

        {/* truck with the pallet grid on the trailer */}
        <div className="relative w-[78%]">
          <TruckSvg className="w-full" />
          <div className="absolute left-[37.5%] top-[16%] grid h-[52%] w-[57%] grid-cols-5 grid-rows-3 gap-1.5 p-1">
            {PALLETS.map((k, i) => <Pallet key={i} kind={k} />)}
          </div>
          <span className="absolute bottom-[2%] left-[54%] flex h-7 w-7 items-center justify-center rounded-full bg-white text-ink shadow-card"><Move size={13} /></span>
        </div>

        {/* load planning panel */}
        <div className="absolute right-0 top-[18%] w-[33%] rounded-3xl bg-white/90 p-3.5 shadow-float backdrop-blur">
        <p className="text-[9px] text-ink-soft">C2-11_1</p>
        <p className="font-display text-sm font-semibold leading-tight">Load planning</p>
        <div className="mt-2 flex items-center gap-1 text-[9px] font-medium">
          <span className="whitespace-nowrap rounded-full bg-white px-2 py-1 shadow-card">Remove assignment</span>
          <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-white px-2 py-1 shadow-card"><Trash2 size={9} /> Clear plan</span>
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white shadow-card"><Plus size={9} /></span>
        </div>
        <div className="mt-2 grid grid-cols-[16px_1fr_2fr] gap-x-2 text-[9px] text-ink-soft"><span /><span>Item</span><span>Vehicle</span></div>
        <ul className="mt-1 space-y-1">
          {[1, 2, 3].map((i) => (
            <li key={i} className="grid grid-cols-[16px_1fr_2fr] items-center gap-x-2 rounded-full bg-white px-2 py-0.5 text-[10px] shadow-card">
              <Package size={11} className="text-ink" /><span>10</span><span className="font-medium">D17_TRUCK {i}</span>
            </li>
          ))}
        </ul>
        </div>
      </div>

      {/* shipment cards strip */}
      <div className="mt-5 flex gap-3 overflow-hidden">
        <ShipmentCard id="USA-146279BS" />
        <ShipmentCard id="IND-220114HR" />
        <ShipmentCard id="SHP-20261104" active />
        <ShipmentCard id="USA-146280BS" />
        <ShipmentCard id="IND-220115DL" />
      </div>

      {/* gantt row */}
      <div className="mt-4 rounded-3xl bg-white/80 p-4 shadow-card backdrop-blur">
        <div className="flex items-center gap-3">
          <p className="font-display text-sm font-semibold">Gantt chart</p>
          <span className="flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[10px] font-medium shadow-card">Freight orders <ChevronDown size={10} /></span>
          <div className="ml-auto flex items-center gap-2 text-[10px] text-ink-soft"><span>15 Jun</span><span className="h-px w-24 bg-line" /><span>16 Jun</span><span className="h-px w-24 bg-line" /><span>17 Jun</span></div>
        </div>
        <div className="mt-3 space-y-1.5">
          {[['14%', '32%', LIME], ['40%', '28%', '#17191D'], ['62%', '30%', VIOLET]].map(([l, w, c], i) => (
            <div key={i} className="relative h-3 rounded-full bg-[#EEF0F4]"><span className="absolute top-0 h-3 rounded-full" style={{ left: l, width: w, background: c }} /></div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- Page ---------- */

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('admin@fleet.com');
  const [password, setPassword] = useState('Admin@123');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={location.state?.from?.pathname || '/'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email, password);
      navigate(location.state?.from?.pathname || '/', { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-[#EEF0F4] lg:grid-cols-[1.35fr_1fr]">
      {/* Workspace preview, like the reference mock-up */}
      <section className="relative hidden overflow-hidden lg:block">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute -left-32 top-0 h-[480px] w-[480px] rounded-full bg-white blur-[80px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[420px] rounded-full bg-[#DDE2EA] blur-[90px]" />
        </div>

        <div className="relative flex h-full flex-col px-10 pb-8 pt-8 xl:px-14">
          <header className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-white shadow-card"><Truck size={20} /></span>
            <span className="font-display text-xl font-bold">FleetTrack</span>
            <span className="ml-auto inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium shadow-card">
              <span className="h-2 w-2 rounded-full" style={{ background: LIME }} /> Live fleet network
            </span>
          </header>

          <div className="mt-6 flex items-start gap-4">
            <span className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink shadow-card" aria-hidden="true"><ChevronLeft size={16} /></span>
            <div>
              <h1 className="font-display text-4xl font-semibold tracking-tight xl:text-5xl">Trucks management</h1>
              <p className="mt-2 max-w-md text-sm text-ink-soft">Plan loads, assign drivers and watch every delivery live. Every vehicle, every shipment and every customer update on one calm screen.</p>
            </div>
          </div>

          <div className="mt-5 flex-1">
            <LoadScene />
          </div>
        </div>
      </section>

      {/* Sign-in card */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <form onSubmit={submit} className="relative w-full max-w-md rounded-[28px] border border-white bg-white p-8 shadow-float sm:p-9">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-white"><Truck size={20} /></span>
            <span className="font-display text-xl font-bold">FleetTrack</span>
          </div>
          <span className="eyebrow">Welcome back</span>
          <h2 className="mt-1 text-3xl font-semibold">Sign in</h2>
          <p className="mb-6 mt-1 text-sm text-ink-soft">Use your fleet account to continue.</p>
          {error && <p role="alert" className="mb-4 rounded-xl bg-ember-soft px-3.5 py-2.5 text-sm text-ember">{error}</p>}

          <label className="label" htmlFor="email">Email</label>
          <div className="relative mb-4">
            <Mail size={16} className="pointer-events-none absolute left-3.5 top-3 text-ink-mute" aria-hidden="true" />
            <input id="email" className="input bg-[#F6F7F9] pl-10 focus:bg-white" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <label className="label" htmlFor="password">Password</label>
          <div className="relative mb-6">
            <Lock size={16} className="pointer-events-none absolute left-3.5 top-3 text-ink-mute" aria-hidden="true" />
            <input id="password" className="input bg-[#F6F7F9] pl-10 pr-11 focus:bg-white" type={show ? 'text' : 'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1.5 rounded-lg p-1.5 text-ink-mute transition-colors hover:bg-cream hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button className="btn btn-dark group w-full py-3 text-[15px]" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
            {!busy && <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />}
          </button>

          <div className="mt-6 rounded-2xl bg-[#F6F7F9] p-4">
            <p className="text-xs font-semibold">Try a demo account</p>
            <p className="help mt-0.5">Click one to fill in the form (available after <code>npm run seed</code>).</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {DEMO.map((d) => {
                const active = email === d.email;
                return (
                  <button type="button" key={d.label} onClick={() => { setEmail(d.email); setPassword(d.password); }} className={`rounded-xl border p-2.5 text-left text-xs transition-all ${active ? 'border-ink bg-white shadow-card' : 'border-transparent bg-white/70 hover:border-line hover:bg-white'}`}>
                    <Avatar name={d.name} size={26} />
                    <span className="mt-2 block font-semibold">{d.label}</span>
                    <span className="block text-ink-soft">{d.note}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-ink-soft">
            Waiting on a parcel? <Link className="font-semibold text-ink underline decoration-2 underline-offset-4" style={{ textDecorationColor: LIME }} to="/track">Track a shipment</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
