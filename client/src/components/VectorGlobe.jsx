import { useEffect, useRef } from 'react';

const HUBS = [
  { lat: 28.6, lng: 77.2 }, // Delhi
  { lat: 25.2, lng: 55.3 }, // Dubai
  { lat: 1.3, lng: 103.8 }, // Singapore
  { lat: 35.7, lng: 139.7 }, // Tokyo
  { lat: 51.5, lng: -0.1 }, // London
  { lat: 40.7, lng: -74 }, // New York
  { lat: -33.9, lng: 151.2 }, // Sydney
  { lat: -23.5, lng: -46.6 }, // Sao Paulo
  { lat: 30.0, lng: 31.2 }, // Cairo
];
const LINKS = [[0, 1], [0, 2], [1, 4], [4, 5], [2, 3], [0, 6], [5, 7], [1, 8]];

const THEMES = {
  light: { disc0: 'rgba(255,255,255,0.95)', disc1: 'rgba(255,244,207,0.6)', grid: '#17191D', gridAlpha: 0.16, rim: '#17191D', rimAlpha: 0.7, dot: '#fff', halo: 'rgba(247,181,0,0.35)' },
  dark: { disc0: 'rgba(78,82,92,0.95)', disc1: 'rgba(32,35,41,0.85)', grid: '#FFFFFF', gridAlpha: 0.22, rim: '#F7B500', rimAlpha: 0.75, dot: '#17191D', halo: 'rgba(247,181,0,0.6)' },
};

/**
 * Slowly rotating wireframe globe drawn on a canvas (a lightweight take on the Framer "vector globe").
 * Small "packets" travel along the routes so the picture feels alive. Decorative only: hidden from
 * assistive tech and static when the user prefers reduced motion. The canvas is drawn at `size`
 * pixels and scales down with CSS, so it never overflows a narrow column.
 */
export default function VectorGlobe({ size = 320, theme = 'light', accent = '#F7B500', className = '', style }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    const T = THEMES[theme] || THEMES.light;
    const R = size / 2 - size * 0.06;
    const cx = size / 2;
    const cy = size / 2;
    const tilt = 0.4;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let rot = 0.6;
    let t = 0;
    let raf = 0;

    const project = (lat, lng) => {
      const la = (lat * Math.PI) / 180;
      const lo = (lng * Math.PI) / 180 + rot;
      const x = Math.cos(la) * Math.sin(lo);
      const y = Math.sin(la);
      const z = Math.cos(la) * Math.cos(lo);
      const y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
      const z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
      return { x: cx + x * R, y: cy - y2 * R, z: z2 };
    };

    const polyline = (pts) => {
      ctx.beginPath();
      let pen = false;
      for (const p of pts) {
        if (p.z < -0.02) { pen = false; continue; }
        if (!pen) { ctx.moveTo(p.x, p.y); pen = true; } else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    };

    const arcPoints = (A, B) => Array.from({ length: 32 }, (_, i) => {
      const k = i / 31;
      const p = project(A.lat + (B.lat - A.lat) * k, A.lng + (B.lng - A.lng) * k);
      const lift = 1 + Math.sin(k * Math.PI) * 0.1;
      return { x: cx + (p.x - cx) * lift, y: cy + (p.y - cy) * lift, z: p.z };
    });

    const draw = () => {
      ctx.clearRect(0, 0, size, size);

      // halo behind the sphere
      const halo = ctx.createRadialGradient(cx, cy, R * 0.9, cx, cy, R * 1.12);
      halo.addColorStop(0, T.halo);
      halo.addColorStop(1, 'rgba(247,181,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.12, 0, Math.PI * 2); ctx.fill();

      // sphere disc with a highlight top-left
      const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.05, cx, cy, R);
      g.addColorStop(0, T.disc0);
      g.addColorStop(1, T.disc1);
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      // graticule
      ctx.lineWidth = 1;
      ctx.strokeStyle = T.grid;
      ctx.globalAlpha = T.gridAlpha;
      for (let lat = -60; lat <= 60; lat += 30) polyline(Array.from({ length: 121 }, (_, i) => project(lat, i * 3)));
      for (let lng = 0; lng < 360; lng += 30) polyline(Array.from({ length: 91 }, (_, i) => project(-90 + i * 2, lng)));
      ctx.globalAlpha = T.rimAlpha;
      ctx.strokeStyle = T.rim;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

      // routes between hubs
      const arcs = LINKS.map(([a, b]) => arcPoints(HUBS[a], HUBS[b]));
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.85;
      for (const arc of arcs) polyline(arc);

      // packets travelling along the routes
      ctx.globalAlpha = 1;
      arcs.forEach((arc, i) => {
        const k = (t * 0.25 + i * 0.13) % 1;
        const idx = Math.min(arc.length - 1, Math.floor(k * (arc.length - 1)));
        const p = arc[idx];
        if (p.z < 0) return;
        ctx.fillStyle = accent;
        ctx.shadowColor = accent; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(p.x, p.y, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;
      });

      // hub dots
      for (const h of HUBS) {
        const p = project(h.lat, h.lng);
        if (p.z < 0) continue;
        ctx.fillStyle = T.dot;
        ctx.beginPath(); ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = accent;
        ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!reduce) { rot += 0.003; t += 0.004; raf = requestAnimationFrame(draw); }
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [size, theme, accent]);

  return <canvas ref={ref} style={{ width: '100%', height: 'auto', aspectRatio: '1 / 1', ...style }} className={className} aria-hidden="true" />;
}
