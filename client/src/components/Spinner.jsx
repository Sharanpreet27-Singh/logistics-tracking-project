export default function Spinner({ full = false, label = 'Loading' }) {
  return (
    <div className={`flex items-center justify-center ${full ? 'min-h-screen' : 'py-16'}`} role="status" aria-label={label}>
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-concrete-dark border-t-lane" />
    </div>
  );
}
