import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns';

export const CITIES = [
  { name: 'Panipat', lat: 29.3909, lng: 76.9635 },
  { name: 'Delhi', lat: 28.6139, lng: 77.209 },
  { name: 'Gurugram', lat: 28.4595, lng: 77.0266 },
  { name: 'Karnal', lat: 29.6857, lng: 76.9905 },
  { name: 'Chandigarh', lat: 30.7333, lng: 76.7794 },
  { name: 'Ludhiana', lat: 30.901, lng: 75.8573 },
  { name: 'Amritsar', lat: 31.634, lng: 74.8723 },
  { name: 'Meerut', lat: 28.9845, lng: 77.7064 },
  { name: 'Agra', lat: 27.1767, lng: 78.0081 },
  { name: 'Jaipur', lat: 26.9124, lng: 75.7873 },
];

export const SHIPMENT_STATUSES = ['Created', 'Assigned', 'Picked Up', 'In Transit', 'Delivered', 'Failed', 'Cancelled'];
export const AVG_SPEED_KMH = 55;

// Mirrors the server's phone rule: digits with an optional + prefix; spaces, dashes, dots and brackets allowed.
export const PHONE_PATTERN = '\\+?[0-9][0-9 ().-]{5,24}';
export const PHONE_HELP = 'Digits only, 7 to 15 of them; an optional + prefix, spaces and dashes are fine';

export const formatDate = (d) => (d ? format(new Date(d), 'dd MMM yyyy') : '-');
export const formatDateTime = (d) => (d ? format(new Date(d), 'dd MMM, HH:mm') : '-');
export const formatTime = (d) => (d ? format(new Date(d), 'hh:mm a') : '-');
export const timeAgo = (d) => (d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : '-');
export const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
export const formatKm = (km) => `${Math.round(km).toLocaleString()} km`;

const rad = (x) => (x * Math.PI) / 180;
export function haversineKm(a, b) {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export const formatDuration = (minutes) => {
  if (minutes == null || Number.isNaN(minutes)) return '-';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};

/** Where a vehicle is along its trip: remaining km, minutes left at average speed and 0-1 progress. */
export function tripProgress(vehicleLocation, pickup, delivery) {
  const total = haversineKm(pickup, delivery) * 1.25 || 1;
  const remainingKm = haversineKm(vehicleLocation, delivery) * 1.25;
  const progress = Math.min(1, Math.max(0, 1 - remainingKm / total));
  return { totalKm: total, remainingKm, minutesLeft: (remainingKm / AVG_SPEED_KMH) * 60, progress };
}

/** Compares the projected arrival with the promised ETA. Returns {label, good}. */
export function scheduleStatus(eta, minutesLeft) {
  if (!eta) return { label: 'No ETA set', good: true };
  const projected = new Date(Date.now() + minutesLeft * 60000);
  const diff = differenceInMinutes(new Date(eta), projected);
  if (Math.abs(diff) < 5) return { label: 'On time', good: true };
  return diff > 0 ? { label: `${formatDuration(diff)} early`, good: true } : { label: `${formatDuration(-diff)} late`, good: false };
}

export function downloadCSV(filename, rows) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}
