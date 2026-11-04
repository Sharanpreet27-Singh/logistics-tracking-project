export default function Spinner({ full = false, label = 'Loading' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${full ? 'min-h-screen' : 'py-16'}`} role="status" aria-label={label}>
      <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-cream-dark border-t-sun" />
      <p className="text-xs text-ink-soft">{label}...</p>
    </div>
  );
}
