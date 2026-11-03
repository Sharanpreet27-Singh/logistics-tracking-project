export default function DashboardCard({ label, value, hint, icon: Icon, accent = '#1B2430' }) {
  return (
    <div className="panel flex items-start justify-between p-4">
      <div>
        <p className="text-sm text-steel">{label}</p>
        <p className="mt-1 font-display text-3xl font-bold" style={{ color: accent }}>{value}</p>
        {hint && <p className="mt-1 text-xs text-steel">{hint}</p>}
      </div>
      {Icon && (
        <span className="rounded-md p-2" style={{ backgroundColor: `${accent}14`, color: accent }}>
          <Icon size={20} aria-hidden="true" />
        </span>
      )}
    </div>
  );
}
