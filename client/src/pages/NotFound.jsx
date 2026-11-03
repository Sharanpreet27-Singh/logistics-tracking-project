import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="font-display text-7xl font-bold text-lane">404</p>
      <h1 className="text-2xl font-bold">This road does not exist</h1>
      <p className="text-steel">The page you are looking for was moved or never existed.</p>
      <Link to="/" className="btn btn-dark mt-2">Back to dashboard</Link>
    </div>
  );
}
