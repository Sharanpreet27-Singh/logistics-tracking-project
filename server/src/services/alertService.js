import { Alert } from '../models/Alert.js';
import { emit } from '../sockets/io.js';

/** Create an alert and push it to connected clients. Skips duplicates for the same vehicle+type inside `dedupeMinutes`. */
export async function createAlert({ type, severity = 'warning', message, vehicle, shipment, dedupeMinutes = 0 }) {
  if (dedupeMinutes && vehicle) {
    const since = new Date(Date.now() - dedupeMinutes * 60000);
    if (await Alert.exists({ type, vehicle, createdAt: { $gte: since } })) return null;
  }
  const alert = await Alert.create({ type, severity, message, vehicle, shipment });
  emit('alert:new', alert.toObject());
  return alert;
}
