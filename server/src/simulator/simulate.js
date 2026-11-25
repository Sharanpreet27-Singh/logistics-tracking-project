/**
 * GPS simulator: moves every "In Transit" vehicle toward its delivery point and pushes
 * positions over Socket.IO, exactly like a real GPS device would. Marks the shipment
 * Delivered on arrival.
 *
 *   npm run simulate -- --interval=2000 --speedup=40 --vehicles=10
 *   npm run simulate -- --auto          # also keep at least 3 trips on the road (demo mode)
 *   npm run simulate -- --auto=5        # keep at least 5
 */
import { io } from 'socket.io-client';
import { env } from '../config/env.js';
import { moveToward, bearing } from '../utils/geo.js';
import { CITIES } from '../seed/cities.js';

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
const AUTO = arg.auto !== undefined; // demo mode: create + dispatch shipments when the road is empty
const MIN_ACTIVE = arg.auto === true || arg.auto === undefined ? 3 : Number(arg.auto) || 3;

const CUSTOMERS = ['Aarav Mehta', 'Priya Nair', 'Rohan Das', 'Sneha Iyer', 'Kabir Singh', 'Meera Joshi', 'Ishaan Rao', 'Ananya Gupta'];
const pick = (list) => list[Math.floor(Math.random() * list.length)];

let token;
let socket;
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
const trips = new Map(); // shipmentId -> { vehicleId, pos, target, plate }

async function loadTrips() {
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
}

/** Demo mode: when fewer than MIN_ACTIVE trips are running, book new shipments and send them out. */
async function autoDispatch() {
  if (!AUTO || trips.size >= MIN_ACTIVE) return false;
  const [{ data: vehicles }, { data: drivers }] = await Promise.all([
    call('/vehicles?limit=100'),
    call('/drivers?status=available&limit=100'),
  ]);
  // Idle vehicles and available drivers; the API re-pairs them on assign and frees both on delivery.
  const free = vehicles.filter((v) => ['idle', 'stopped'].includes(v.status));
  const freeDrivers = drivers;
  const need = Math.min(MIN_ACTIVE - trips.size, free.length, freeDrivers.length);
  for (let i = 0; i < need; i++) {
    const a = pick(CITIES);
    let b = pick(CITIES);
    while (b === a) b = pick(CITIES);
    const v = free[i];
    const place = (c) => ({ address: c.name, lat: c.lat, lng: c.lng });
    const weightKg = Math.max(20, Math.round(v.capacityKg * (0.3 + Math.random() * 0.5)));
    const s = (await call('/shipments', { method: 'POST', body: JSON.stringify({ customerName: pick(CUSTOMERS), customerPhone: `98${Math.floor(10000000 + Math.random() * 89999999)}`, pickup: place(a), delivery: place(b), weightKg }) })).data;
    await call(`/shipments/${s._id}/assign`, { method: 'PATCH', body: JSON.stringify({ vehicleId: v._id, driverId: freeDrivers[i]._id }) });
    await call(`/shipments/${s._id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'Picked Up', note: 'Picked up (simulated)' }) });
    await call(`/shipments/${s._id}/status`, { method: 'PATCH', body: JSON.stringify({ status: 'In Transit', note: 'Left the depot (simulated)' }) });
    console.log(`★ auto-dispatched ${s.trackingId}: ${a.name} → ${b.name} on ${v.registrationNo}`);
  }
  return need > 0;
}

async function refresh() {
  try {
    await loadTrips();
    if (await autoDispatch()) await loadTrips();
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

async function start() {
  if (!env.demoMode) throw new Error('The GPS simulator requires DEMO_MODE=true and a demo API.');
  if ((await call('/health')).demoMode !== true) throw new Error('The target API has demo mode disabled.');
  await login();

  socket = io(API, { auth: (cb) => cb({ token }) });
  socket.on('connect', () => console.log('Simulator connected'));
  socket.on('connect_error', (e) => console.log('Socket error:', e.message));

  await refresh();
  if (!trips.size) console.log(AUTO ? 'No In Transit shipments yet; auto-dispatch will book some shortly.' : 'No In Transit shipments yet. Run `npm run seed`, move a shipment to In Transit in the UI, or start with --auto. Watching...');
  setInterval(refresh, 10000);
  setInterval(tick, INTERVAL);
}

await start().catch((error) => {
  socket?.disconnect();
  console.error(error.message);
  process.exitCode = 1;
});
