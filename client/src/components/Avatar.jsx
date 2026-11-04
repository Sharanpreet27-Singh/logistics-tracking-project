const PALETTE = ['#F7B500', '#E8553F', '#D14A8E', '#2563EB', '#1F9D55', '#7C3AED'];

/** Initials avatar; colour is stable per name. */
export default function Avatar({ name = '', size = 36, className = '' }) {
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';
  const color = PALETTE[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETTE.length];
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-display font-bold text-white ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38, backgroundColor: color }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}
