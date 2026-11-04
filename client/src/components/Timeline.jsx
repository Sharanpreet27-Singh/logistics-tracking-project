import { Check } from 'lucide-react';

/**
 * Vertical checklist timeline like the shipment card in the analytics reference.
 * items: [{ title, subtitle, time, state: 'done' | 'current' | 'todo' }]
 */
export default function Timeline({ items = [] }) {
  return (
    <ol className="space-y-0">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        const done = it.state === 'done';
        const current = it.state === 'current';
        return (
          <li key={`${it.title}-${i}`} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && <span className={`absolute left-[11px] top-6 h-[calc(100%-12px)] w-0.5 ${done ? 'bg-ember' : 'bg-line'}`} aria-hidden="true" />}
            <span
              className={`relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${
                done ? 'border-ember bg-ember text-white' : current ? 'border-sun bg-sun-soft' : 'border-line bg-white'
              }`}
              aria-hidden="true"
            >
              {done && <Check size={13} strokeWidth={3} />}
              {current && <span className="h-2 w-2 rounded-sm bg-sun" />}
            </span>
            <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${it.state === 'todo' ? 'text-ink-mute' : ''}`}>{it.title}</p>
                {it.subtitle && <p className="truncate text-xs text-ink-soft">{it.subtitle}</p>}
              </div>
              {it.time && <span className="shrink-0 text-xs text-ink-soft">{it.time}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
