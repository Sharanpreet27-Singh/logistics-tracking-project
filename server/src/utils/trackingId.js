import { randomInt } from 'node:crypto';

// No 0/O or 1/I, so IDs read unambiguously over the phone. 32^6 = ~1 billion per day: not guessable.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const dateStamp = (d = new Date()) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;

/** SHP-YYYYMMDD-XXXXXX with a random suffix. */
export function makeTrackingId(date = new Date()) {
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += ALPHABET[randomInt(ALPHABET.length)];
  return `SHP-${dateStamp(date)}-${suffix}`;
}

export async function generateTrackingId(Shipment, date = new Date()) {
  for (let i = 0; i < 5; i++) {
    const id = makeTrackingId(date);
    if (!(await Shipment.exists({ trackingId: id }))) return id;
  }
  throw new Error('Could not allocate a unique tracking ID');
}
