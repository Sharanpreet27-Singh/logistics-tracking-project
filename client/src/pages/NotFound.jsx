import { Link } from 'react-router-dom';
import { Truck } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-cream p-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-sun text-ink shadow-card"><Truck size={30} /></span>
      <p className="font-display text-7xl font-extrabold">404</p>
      <h1 className="text-2xl font-bold">This road does not exist</h1>
      <p className="text-ink-soft">The page you are looking for was moved or never existed.</p>
      <Link to="/" className="btn btn-dark mt-2">Back to dashboard</Link>
    </div>
  );
}
