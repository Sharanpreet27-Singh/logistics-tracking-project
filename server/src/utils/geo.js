const EARTH_RADIUS_KM = 6371;
const toRad = (deg) => (deg * Math.PI) / 180;
const toDeg = (rad) => (rad * 180) / Math.PI;

/** Great-circle distance between two {lat, lng} points in km. */
export function haversineKm(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Rough road distance: straight line x 1.25 detour factor. */
export function roadDistanceKm(a, b) {
  return Math.round(haversineKm(a, b) * 1.25 * 10) / 10;
}

/** Initial compass bearing (0-360) from a to b. */
export function bearing(a, b) {
  const y = Math.sin(toRad(b.lng - a.lng)) * Math.cos(toRad(b.lat));
  const x =
    Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) -
    Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lng - a.lng));
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Move from -> to by stepKm. Returns the new point and whether it arrived. */
export function moveToward(from, to, stepKm) {
  const distance = haversineKm(from, to);
  if (distance <= stepKm) return { lat: to.lat, lng: to.lng, arrived: true };
  const f = stepKm / distance;
  return {
    lat: from.lat + (to.lat - from.lat) * f,
    lng: from.lng + (to.lng - from.lng) * f,
    arrived: false,
  };
}

export const estimateMinutes = (km, avgSpeedKmh = 45) => Math.round((km / avgSpeedKmh) * 60);

/** Nearest-neighbour ordering of stops starting from `start`. */
export function optimizeStops(start, stops) {
  const remaining = [...stops];
  const ordered = [];
  let current = start;
  let total = 0;
  while (remaining.length) {
    let bestIdx = 0;
    let best = Infinity;
    remaining.forEach((s, i) => {
      const d = haversineKm(current, s);
      if (d < best) {
        best = d;
        bestIdx = i;
      }
    });
    const [next] = remaining.splice(bestIdx, 1);
    total += best;
    ordered.push(next);
    current = next;
  }
  return { ordered, totalKm: Math.round(total * 1.25 * 10) / 10 };
}
