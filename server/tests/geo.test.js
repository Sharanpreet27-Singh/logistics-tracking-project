import test from 'node:test';
import assert from 'node:assert/strict';
import { haversineKm, moveToward, optimizeStops, estimateMinutes } from '../src/utils/geo.js';

const delhi = { lat: 28.6139, lng: 77.209 };
const panipat = { lat: 29.3909, lng: 76.9635 };

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

test('optimizeStops visits the nearest stop first', () => {
  const near = { lat: 28.7, lng: 77.1, name: 'near' };
  const far = { lat: 30.7, lng: 76.7, name: 'far' };
  const { ordered } = optimizeStops(delhi, [far, near]);
  assert.equal(ordered[0].name, 'near');
});

test('estimateMinutes uses average speed', () => {
  assert.equal(estimateMinutes(45, 45), 60);
});
