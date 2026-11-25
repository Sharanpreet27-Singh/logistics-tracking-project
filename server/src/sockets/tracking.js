import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { sequelize } from '../config/db.js';
import { env } from '../config/env.js';
import { Vehicle } from '../models/Vehicle.js';
import { locationSchema } from '../validators/schemas.js';
import { createAlert } from '../services/alertService.js';
import { setIo, emit } from './io.js';

const SPEED_LIMIT_KMH = 80;
const CAN_PUSH_LOCATION = ['admin', 'manager', 'dispatcher'];

export function initSockets(httpServer) {
  const io = new Server(httpServer, { cors: { origin: env.clientUrls, credentials: true } });
  setIo(io);

  // Same JWT as the REST API
  io.use((socket, next) => {
    try {
      const payload = jwt.verify(socket.handshake.auth?.token, env.accessSecret);
      socket.user = { id: payload.sub, role: payload.role };
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join('fleet');

    // GPS device / simulator pushes a position
    socket.on('vehicle:location', async (raw) => {
      if (!CAN_PUSH_LOCATION.includes(socket.user.role)) return;
      const parsed = locationSchema.safeParse(raw);
      if (!parsed.success) return;
      const { vehicleId, lat, lng, speed, heading } = parsed.data;
      try {
        const vehicle = await sequelize.transaction(async (transaction) => {
          const record = await Vehicle.findByPk(vehicleId, { transaction, lock: true });
          if (!record || record.status === 'maintenance') return null;
          // A halted moving vehicle becomes stopped. A booked or idle vehicle keeps its status.
          const status = speed > 0 ? 'moving' : (record.status === 'moving' ? 'stopped' : record.status);
          await record.update({ location: { lat, lng }, speed, heading, lastUpdated: new Date(), status }, { transaction });
          if (speed > SPEED_LIMIT_KMH) {
            await createAlert({
              type: 'speeding',
              severity: 'warning',
              message: `${record.registrationNo} is travelling at ${Math.round(speed)} km/h`,
              vehicle: record._id,
              dedupeMinutes: 5,
            }, transaction);
          }
          return record;
        });
        if (vehicle) emit('vehicle:location', { vehicleId, lat, lng, speed, heading, status: vehicle.status, timestamp: vehicle.lastUpdated });
      } catch (err) {
        console.error('vehicle:location failed', err.message);
      }
    });
  });
  return io;
}
