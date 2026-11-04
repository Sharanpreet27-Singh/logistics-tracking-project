import { useEffect, useRef, useState } from 'react';
import Sparkline from './Sparkline.jsx';

/** Counts from the previous value to the new one so live updates are noticeable but calm. */
export function AnimatedNumber({ value, duration = 700 }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    const target = Number(value) || 0;
    if (start === target) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { from.current = target; setShown(target); return undefined; }
    const t0 = performance.now();
    let raf = 0;
    const step = (now) => {
      const k = Math.min(1, (now - t0) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(Math.round(start + (target - start) * eased));
      if (k < 1) raf = requestAnimationFrame(step); else from.current = target;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{shown}</>;
}

/**
 * Stat card in the style of the analytics reference: big number, a "vs" line and a small chart.
 * delta: text like "+1.1%"; good: colours the delta green (true) or red (false).
 */
export default function DashboardCard({ label, value, hint, delta, good = true, icon: Icon, accent = '#17191D', spark, sparkType = 'line', children }) {
  return (
    <div className="card flex items-start justify-between gap-3 p-5 transition-transform duration-300 hover:-translate-y-0.5">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {Icon && (
            <span className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ backgroundColor: `${accent}14`, color: accent }}>
              <Icon size={15} aria-hidden="true" />
            </span>
          )}
          <p className="text-sm font-medium text-ink-soft">{label}</p>
        </div>
        <p className="mt-2 font-display text-3xl font-bold leading-none">{value}</p>
        {(delta || hint) && (
          <p className="mt-2 text-xs text-ink-soft">
            {delta && <span className={`font-semibold ${good ? 'text-leaf' : 'text-ember'}`}>{delta}</span>}
            {delta && hint && <span className="text-ink-mute"> · </span>}
            {hint}
          </p>
        )}
        {children}
      </div>
      {spark && <div className="shrink-0 self-end"><Sparkline data={spark} color={accent === '#17191D' ? '#E8553F' : accent} type={sparkType} /></div>}
    </div>
  );
}
