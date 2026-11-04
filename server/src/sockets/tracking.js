import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
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
        // Moving when there is speed; a halted truck becomes "stopped" but a booked/idle one keeps its status.
        const vehicle = await Vehicle.findOneAndUpdate(
          { _id: vehicleId, status: { $ne: 'maintenance' } },
          [{ $set: {
            location: { lat, lng }, speed, heading, lastUpdated: new Date(),
            status: { $cond: [{ $gt: [speed, 0] }, 'moving', { $cond: [{ $eq: ['$status', 'moving'] }, 'stopped', '$status'] }] },
          } }],
          { new: true }
        );
        if (!vehicle) return;
        emit('vehicle:location', { vehicleId, lat, lng, speed, heading, status: vehicle.status, timestamp: vehicle.lastUpdated });
        if (speed > SPEED_LIMIT_KMH) {
          await createAlert({
            type: 'speeding',
            severity: 'warning',
            message: `${vehicle.registrationNo} is travelling at ${Math.round(speed)} km/h`,
            vehicle: vehicle._id,
            dedupeMinutes: 5,
          });
        }
      } catch (err) {
        console.error('vehicle:location failed', err.message);
      }
    });
  });
  return io;
}
