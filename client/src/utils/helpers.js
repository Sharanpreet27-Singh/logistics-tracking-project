import { format, formatDistanceToNow } from 'date-fns';

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

export const formatDate = (d) => (d ? format(new Date(d), 'dd MMM yyyy') : '-');
export const formatDateTime = (d) => (d ? format(new Date(d), 'dd MMM, HH:mm') : '-');
export const timeAgo = (d) => (d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : '-');
export const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

const rad = (x) => (x * Math.PI) / 180;
export function haversineKm(a, b) {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export const formatDuration = (minutes) => {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h ? `${h}h ${m}m` : `${m}m`;
};

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
