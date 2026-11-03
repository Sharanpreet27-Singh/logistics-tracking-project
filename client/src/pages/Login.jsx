import { useState } from 'react';
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { errorMessage } from '../services/api.js';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('admin@fleet.com');
  const [password, setPassword] = useState('Admin@123');
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
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-asphalt-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-md bg-lane text-asphalt-950"><Truck size={22} /></span>
          <span className="font-display text-2xl font-bold">FleetTrack</span>
        </div>
        <div>
          <h1 className="max-w-md text-5xl font-bold leading-tight">Every vehicle, every delivery, on one screen.</h1>
          <p className="mt-4 max-w-md text-white/70">Watch your fleet move in real time, assign shipments in two clicks and see which deliveries are running late.</p>
        </div>
        <div className="h-2 w-full bg-[repeating-linear-gradient(90deg,#F2B705_0_40px,transparent_40px_80px)]" aria-hidden="true" />
      </div>

      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm">
          <h2 className="text-3xl font-bold">Sign in</h2>
          <p className="mb-6 mt-1 text-sm text-steel">Use your fleet account to continue.</p>
          {error && <p role="alert" className="mb-4 rounded-md bg-stop/10 px-3 py-2 text-sm text-stop">{error}</p>}
          <label className="label" htmlFor="email">Email</label>
          <input id="email" className="input mb-4" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <label className="label" htmlFor="password">Password</label>
          <input id="password" className="input mb-6" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <button className="btn btn-dark w-full py-2.5" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
          <p className="mt-6 text-center text-sm text-steel">
            Waiting on a parcel? <Link className="font-semibold text-asphalt-900 underline" to="/track">Track a shipment</Link>
          </p>
          <p className="mt-6 rounded-md bg-lane-soft px-3 py-2 text-xs text-asphalt-800">Demo accounts (after <code>npm run seed</code>): admin@fleet.com / Admin@123, manager@fleet.com / Manager@123, dispatcher@fleet.com / Dispatch@123</p>
        </form>
      </div>
    </div>
  );
}
