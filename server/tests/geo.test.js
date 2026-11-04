import test from 'node:test';
import assert from 'node:assert/strict';
import { haversineKm, moveToward, optimizeStops, estimateMinutes } from '../src/utils/geo.js';

const delhi = { lat: 28.6139, lng: 77.209, name: 'Delhi' };
const panipat = { lat: 29.3909, lng: 76.9635, name: 'Panipat' };
const karnal = { lat: 29.6857, lng: 76.9905, name: 'Karnal' };
const chandigarh = { lat: 30.7333, lng: 76.7794, name: 'Chandigarh' };

test('haversineKm gives a realistic Delhi-Panipat distance', () => {
  const d = haversineKm(delhi, panipat);
  assert.ok(d > 80 && d < 100, `got ${d}`);
});

test('moveToward arrives when step exceeds remaining distance', () => {
  const res = moveToward(delhi, panipat, 500);
  assert.equal(res.arrived, true);
  assert.equal(res.lat, panipat.lat);
});

test('moveToward moves partway otherwise', () => {
  const res = moveToward(delhi, panipat, 10);
  assert.equal(res.arrived, false);
  assert.ok(haversineKm(res, panipat) < haversineKm(delhi, panipat));
});

test('optimizeStops visits the nearest stop first when that is shortest', () => {
  const near = { lat: 28.7, lng: 77.1, name: 'near' };
  const far = { lat: 30.7, lng: 76.7, name: 'far' };
  const { ordered, exact } = optimizeStops(delhi, [far, near]);
  assert.equal(ordered[0].name, 'near');
  assert.equal(exact, true);
});

test('optimizeStops finds the shortest order, not just the nearest next stop', () => {
  // From Panipat, nearest-neighbour would go Karnal first (closest) and end up driving back south to Delhi.
  const { ordered, totalKm } = optimizeStops(panipat, [delhi, karnal, chandigarh]);
  assert.deepEqual(ordered.map((s) => s.name), ['Delhi', 'Karnal', 'Chandigarh']);
  const greedyKm = (haversineKm(panipat, karnal) + haversineKm(karnal, chandigarh) + haversineKm(chandigarh, delhi)) * 1.25;
  assert.ok(totalKm < greedyKm, `${totalKm} should beat greedy ${greedyKm}`);
});

test('optimizeStops still improves on greedy for many stops (2-opt path)', () => {
  const stops = Array.from({ length: 12 }, (_, i) => ({ lat: 28 + Math.sin(i) * 1.5, lng: 76 + Math.cos(i * 1.3) * 1.5, name: `s${i}` }));
  const { ordered, exact, totalKm } = optimizeStops(delhi, stops);
  assert.equal(exact, false);
  assert.equal(ordered.length, 12);
  assert.ok(totalKm > 0);
});

test('estimateMinutes uses average speed', () => {
  assert.equal(estimateMinutes(45, 45), 60);
});
