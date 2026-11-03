/**
 * GPS simulator: moves every "In Transit" vehicle toward its delivery point and pushes
 * positions over Socket.IO, exactly like a real GPS device would. Marks the shipment
 * Delivered on arrival.
 *
 *   npm run simulate -- --interval=2000 --speedup=40 --vehicles=10
 */
import { io } from 'socket.io-client';
import { moveToward, bearing } from '../utils/geo.js';

const arg = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const API = process.env.API_URL || 'http://localhost:5000';
const EMAIL = process.env.SIM_EMAIL || 'admin@fleet.com';
const PASSWORD = process.env.SIM_PASSWORD || 'Admin@123';
const INTERVAL = Number(arg.interval || 2000);
const SPEEDUP = Number(arg.speedup || 40); // make trips finish in minutes instead of hours
const MAX = Number(arg.vehicles || 20);

let token;
async function call(path, options = {}) {
  const res = await fetch(`${API}/api/v1${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message || res.statusText);
  return body;
}

const login = async () => {
  token = (await call('/auth/login', { method: 'POST', body: JSON.stringify({ email: EMAIL, password: PASSWORD }) })).data.accessToken;
};
await login();

const socket = io(API, { auth: (cb) => cb({ token }) });
socket.on('connect', () => console.log('Simulator connected'));
socket.on('connect_error', (e) => console.log('Socket error:', e.message));

const trips = new Map(); // shipmentId -> { vehicleId, pos, target, plate }

async function refresh() {
  try {
    const { data } = await call('/shipments?status=In%20Transit&limit=100');
    for (const s of data.slice(0, MAX)) {
      if (!s.vehicle || trips.has(s._id)) continue;
      trips.set(s._id, {
        vehicleId: s.vehicle._id,
        plate: s.vehicle.registrationNo,
        pos: { lat: s.vehicle.location.lat, lng: s.vehicle.location.lng },
        target: { lat: s.delivery.lat, lng: s.delivery.lng },
        trackingId: s.trackingId,
      });
      console.log(`+ ${s.vehicle.registrationNo} heading to ${s.delivery.address} (${s.trackingId})`);
    }
  } catch (e) {
    if (/token/i.test(e.message)) await login().catch(() => {});
    else console.log('refresh failed:', e.message);
  }
}

async function tick() {
  for (const [shipmentId, t] of trips) {
    const spike = Math.random() < 0.04;
    const speed = spike ? 85 + Math.random() * 10 : 50 + Math.random() * 20;
    const step = speed * (INTERVAL / 3600000) * SPEEDUP;
    const next = moveToward(t.pos, t.target, step);
    const heading = bearing(t.pos, t.target);
    t.pos = { lat: next.lat, lng: next.lng };
    socket.emit('vehicle:location', { vehicleId: t.vehicleId, lat: next.lat, lng: next.lng, speed: next.arrived ? 0 : speed, heading });
    if (next.arrived) {
      trips.delete(shipmentId);
      try {
        await call(`/shipments/${shipmentId}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'Delivered', note: 'Delivered (simulated)' }) });
        console.log(`✓ ${t.plate} delivered ${t.trackingId}`);
      } catch (e) {
        console.log('could not mark delivered:', e.message);
      }
    }
  }
}

await refresh();
if (!trips.size) console.log('No In Transit shipments yet. Run `npm run seed`, or move a shipment to In Transit in the UI. Watching...');
setInterval(refresh, 10000);
setInterval(tick, INTERVAL);
