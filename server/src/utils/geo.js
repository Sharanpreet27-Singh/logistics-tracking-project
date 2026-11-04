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

const EXACT_LIMIT = 8; // 8! = 40,320 orders, still instant

/**
 * Orders `stops` from `start` to minimise total driving. Exact (every order tried) for up to
 * EXACT_LIMIT stops; nearest-neighbour followed by 2-opt improvement beyond that.
 * Returns { ordered, totalKm, exact }.
 */
export function optimizeStops(start, stops) {
  const pts = [start, ...stops];
  const D = pts.map((a) => pts.map((b) => haversineKm(a, b)));
  const cost = (order) => {
    let total = 0;
    let cur = 0;
    for (const i of order) { total += D[cur][i]; cur = i; }
    return total;
  };
  const idx = stops.map((_, i) => i + 1);
  let best;

  if (stops.length <= EXACT_LIMIT) {
    const walk = (prefix, rest, soFar) => {
      if (best && soFar >= best.cost) return; // cannot beat the best order found so far
      if (!rest.length) { best = { order: prefix, cost: soFar }; return; }
      const cur = prefix.length ? prefix[prefix.length - 1] : 0;
      for (let i = 0; i < rest.length; i++) {
        walk([...prefix, rest[i]], rest.filter((_, j) => j !== i), soFar + D[cur][rest[i]]);
      }
    };
    walk([], idx, 0);
  } else {
    let order = [];
    const remaining = [...idx];
    let cur = 0;
    while (remaining.length) {
      let bi = 0;
      for (let i = 1; i < remaining.length; i++) if (D[cur][remaining[i]] < D[cur][remaining[bi]]) bi = i;
      cur = remaining.splice(bi, 1)[0];
      order.push(cur);
    }
    let improved = true;
    while (improved) {
      improved = false;
      for (let i = 0; i < order.length - 1; i++) {
        for (let j = i + 1; j < order.length; j++) {
          const candidate = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)];
          if (cost(candidate) < cost(order) - 1e-9) { order = candidate; improved = true; }
        }
      }
    }
    best = { order, cost: cost(order) };
  }

  return { ordered: best.order.map((i) => pts[i]), totalKm: Math.round(best.cost * 1.25 * 10) / 10, exact: stops.length <= EXACT_LIMIT };
}
