import { useId } from 'react';

/** Tiny inline chart for stat cards. type: 'line' (area under a line) or 'bars'. */
export default function Sparkline({ data = [], color = '#E8553F', type = 'line', width = 100, height = 40 }) {
  const id = useId();
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const x = (i) => (i / Math.max(data.length - 1, 1)) * width;
  const y = (v) => height - ((v - min) / span) * (height - 6) - 3;

  if (type === 'bars') {
    const bw = width / data.length;
    return (
      <svg width={width} height={height} aria-hidden="true">
        {data.map((v, i) => (
          <rect key={i} x={i * bw + 1.5} y={y(v)} width={Math.max(bw - 3, 2)} height={height - y(v)} rx="2" fill={i === data.length - 1 ? color : `${color}40`} />
        ))}
      </svg>
    );
  }

  const path = data.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${path} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${id})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x(data.length - 1)} cy={y(data[data.length - 1])} r="3" fill={color} />
    </svg>
  );
}
