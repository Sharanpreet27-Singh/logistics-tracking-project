import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { io } from 'socket.io-client';

test('MySQL persists an authenticated shipment, its GPS updates, and its reports', {
  skip: process.env.MYSQL_INTEGRATION_TEST !== '1',
  timeout: 30000,
}, async (t) => {
  const { sequelize } = await import('../src/config/db.js');
  const { Alert, Driver, Shipment, User, Vehicle } = await import('../src/models/index.js');
  const { default: app } = await import('../src/app.js');
  const { initSockets } = await import('../src/sockets/tracking.js');
  const suffix = randomBytes(5).toString('hex');
  const email = `verify-${suffix}@example.com`;
  const password = randomBytes(16).toString('hex');
  const shipments = [];
  let vehicle, driver, client;
  const server = createServer(app);
  const sockets = initSockets(server);
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    client?.disconnect();
    await sockets.close();
    try {
      if (vehicle) await Alert.destroy({ where: { vehicle: vehicle._id } });
      if (shipments.length) await Shipment.destroy({ where: { _id: shipments } });
      if (driver) await Driver.destroy({ where: { _id: driver._id } });
      if (vehicle) await Vehicle.destroy({ where: { _id: vehicle._id } });
      await User.destroy({ where: { email } });
    } finally {
      await sequelize.close();
    }
  });

  execFileSync(process.execPath, ['src/admin/createAdmin.js'], {
    env: { ...process.env, ADMIN_NAME: 'Test admin', ADMIN_EMAIL: email, ADMIN_PASSWORD: password },
  });

  const base = `http://127.0.0.1:${server.address().port}`;
  let token;
  async function request(route, { method = 'GET', body, status = 200 } = {}) {
    const result = await fetch(`${base}/api/v1${route}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: body && JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    const payload = await result.json();
    if (status) assert.equal(result.status, status, `${method} ${route}: ${payload.message || ''}`);
    return { ...payload, status: result.status };
  }

  const { data: login } = await request('/auth/login', { method: 'POST', body: { email, password } });
  assert.equal(login.user.role, 'admin');
  token = login.accessToken;
  ({ data: vehicle } = await request('/vehicles', { method: 'POST', body: { registrationNo: `TEST-${suffix}`, type: 'Truck', capacityKg: 2000 }, status: 201 }));
  assert.equal(vehicle.location, null);
  ({ data: driver } = await request('/drivers', { method: 'POST', body: { name: 'Test Driver', phone: '9800000000', licenseNo: suffix }, status: 201 }));
  const filtered = await request(`/vehicles?search=${suffix.toUpperCase()}&status=idle,booked`);
  assert.equal(filtered.meta.total, 1);
  assert.equal(filtered.data[0]._id, vehicle._id);
  assert.equal((await request('/vehicles?search=%25')).meta.total, 0);

  const details = {
    customerName: 'Test Customer', weightKg: 50,
    pickup: { address: 'Test Pickup', lat: 30.1, lng: 76.1 },
    delivery: { address: 'Test Destination', lat: 31.1, lng: 77.1 },
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data } = await request('/shipments', { method: 'POST', body: details, status: 201 });
    shipments.push(data._id);
  }

  const assignments = await Promise.all(shipments.map((id) => request(`/shipments/${id}/assign`, {
    method: 'PATCH', body: { vehicleId: vehicle._id, driverId: driver._id }, status: null,
  })));
  assert.deepEqual(assignments.map((item) => item.status).sort(), [200, 400]);
  const assigned = assignments.find((item) => item.status === 200).data;
  assert.equal(assigned.vehicle._id, vehicle._id);
  assert.equal(assigned.vehicle.location, null);
  assert.deepEqual(assigned.timeline.map((entry) => entry.status), ['Created', 'Assigned']);

  const advance = (status) => request(`/shipments/${assigned._id}/status`, { method: 'PATCH', body: { status } });
  await advance('Picked Up');
  await advance('In Transit');
  const tracking = `/track/${assigned.trackingId}`;
  assert.equal((await request(tracking)).data.vehicleLocation, null);
  const dashboard = (await request('/dashboard/stats')).data;
  assert.equal(dashboard.recent.find((item) => item._id === assigned._id).driver._id, driver._id);

  client = io(base, { auth: { token }, reconnection: false, transports: ['websocket'] });
  await once(client, 'connect', { signal: AbortSignal.timeout(5000) });
  const point = { lat: 30.65, lng: 76.79 };
  const event = once(client, 'vehicle:location', { signal: AbortSignal.timeout(5000) });
  client.emit('vehicle:location', { vehicleId: vehicle._id, ...point, speed: 87, heading: 45 });
  await event;
  assert.deepEqual((await request(tracking)).data.vehicleLocation, point);
  const alert = (await request('/alerts')).data.find((item) => item.vehicle?._id === vehicle._id);
  assert.equal(alert.type, 'speeding');
  assert.equal((await request(`/alerts/${alert._id}/read`, { method: 'PATCH' })).data.isRead, true);

  const completed = (await advance('Delivered')).data;
  assert.deepEqual(completed.vehicle.location, point);
  const report = (await request('/reports/vehicles')).data.find((item) => item.id === vehicle._id);
  assert.equal(report.delivered, 1);
  assert.ok((await request('/reports/deliveries')).data.length);
  assert.equal((await request(tracking)).data.vehicleLocation, null);
});
