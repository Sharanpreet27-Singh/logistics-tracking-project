import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Vehicle } from '../models/Vehicle.js';
import { Driver } from '../models/Driver.js';
import { Shipment } from '../models/Shipment.js';
import { Alert } from '../models/Alert.js';
import { roadDistanceKm, estimateMinutes } from '../utils/geo.js';
import { city } from './cities.js';

const days = (n) => new Date(Date.now() - n * 86400000);
const hours = (n) => new Date(Date.now() + n * 3600000);
let seq = 1000;
const trackingId = () => `SHP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(++seq).padStart(4, '0')}`;

await connectDB();
await Promise.all([User, Vehicle, Driver, Shipment, Alert].map((M) => M.deleteMany({})));

// ---- Users ----
await User.create([
  { name: 'Aarav Admin', email: 'admin@fleet.com', passwordHash: await User.hash('Admin@123'), role: 'admin' },
  { name: 'Meera Manager', email: 'manager@fleet.com', passwordHash: await User.hash('Manager@123'), role: 'manager' },
  { name: 'Dev Dispatcher', email: 'dispatcher@fleet.com', passwordHash: await User.hash('Dispatch@123'), role: 'dispatcher' },
]);

// ---- Vehicles ----
const vehicleData = [
  ['HR38AB1001', 'Truck', 'Tata', 'Prima 4028', 28000],
  ['HR38AB1002', 'Truck', 'Ashok Leyland', '3118', 31000],
  ['HR55CD2003', 'Mini Truck', 'Mahindra', 'Bolero Pickup', 1700],
  ['DL1CE3004', 'Van', 'Maruti', 'Eeco Cargo', 600],
  ['HR26FG4005', 'Trailer', 'BharatBenz', '4228R', 40000],
  ['PB10HJ5006', 'Truck', 'Eicher', 'Pro 3019', 19000],
  ['HR38KL6007', 'Mini Truck', 'Tata', 'Intra V30', 1300],
  ['DL3MN7008', 'Van', 'Force', 'Traveller Cargo', 1200],
];
const vehicles = await Vehicle.create(
  vehicleData.map(([registrationNo, type, make, model, capacityKg], i) => ({
    registrationNo, type, make, model, capacityKg,
    fuelType: i === 3 ? 'CNG' : 'Diesel',
    nextServiceDate: hours(24 * (15 + i * 9)),
    insuranceExpiry: hours(24 * (i === 2 ? 12 : 120 + i * 20)),
    status: i === 7 ? 'maintenance' : 'idle',
    lastUpdated: new Date(),
  }))
);

// ---- Drivers ----
const driverData = [
  ['Rajesh Kumar', '9810000001', 4.8], ['Sukhdev Singh', '9810000002', 4.6], ['Amit Sharma', '9810000003', 4.2],
  ['Vikram Yadav', '9810000004', 4.5], ['Harpreet Gill', '9810000005', 4.9], ['Manoj Verma', '9810000006', 3.9],
  ['Imran Khan', '9810000007', 4.3],
];
const drivers = await Driver.create(
  driverData.map(([name, phone, rating], i) => ({
    name, phone, rating,
    email: `${name.split(' ')[0].toLowerCase()}@fleet.com`,
    licenseNo: `HR0620200${1000 + i}`,
    licenseExpiry: hours(24 * (i === 5 ? 20 : 300 + i * 30)),
    status: i === 6 ? 'off-duty' : 'available',
  }))
);

// ---- Shipments ----
const customers = ['Sharma Traders', 'Bharat Foods', 'Kapoor Textiles', 'Gill Agro', 'Metro Retail', 'Jain Electronics', 'Verma Steel', 'Sunrise Pharma'];
const pairs = [
  ['Panipat', 'Delhi'], ['Delhi', 'Jaipur'], ['Karnal', 'Chandigarh'], ['Ludhiana', 'Amritsar'], ['Gurugram', 'Agra'],
  ['Meerut', 'Panipat'], ['Chandigarh', 'Delhi'], ['Jaipur', 'Agra'], ['Amritsar', 'Karnal'], ['Delhi', 'Meerut'],
];

function build(i, status, extra = {}) {
  const [a, b] = pairs[i % pairs.length];
  const pickup = city(a);
  const delivery = city(b);
  const distanceKm = roadDistanceKm(pickup, delivery);
  return {
    trackingId: trackingId(),
    customerName: customers[i % customers.length],
    customerPhone: `98000000${10 + i}`,
    pickup, delivery, distanceKm,
    weightKg: 200 + i * 350,
    status,
    eta: hours(estimateMinutes(distanceKm) / 60 + 1),
    timeline: [{ status: 'Created', note: 'Shipment created' }],
    ...extra,
  };
}

const shipments = [];

// 4 in transit, each with its own vehicle + driver, positioned part-way along the route
for (let i = 0; i < 4; i++) {
  const v = vehicles[i];
  const d = drivers[i];
  const s = build(i, 'In Transit', {
    vehicle: v._id, driver: d._id,
    timeline: [
      { status: 'Created', note: 'Shipment created' },
      { status: 'Assigned', note: `${v.registrationNo} / ${d.name}` },
      { status: 'Picked Up' },
      { status: 'In Transit' },
    ],
  });
  const f = 0.2 + i * 0.12;
  v.location = { lat: s.pickup.lat + (s.delivery.lat - s.pickup.lat) * f, lng: s.pickup.lng + (s.delivery.lng - s.pickup.lng) * f };
  v.status = 'moving';
  v.speed = 55;
  v.assignedDriver = d._id;
  d.status = 'on-trip';
  d.assignedVehicle = v._id;
  shipments.push(s);
}

// 1 assigned, waiting for pickup
{
  const v = vehicles[4], d = drivers[4];
  const s = build(4, 'Assigned', {
    vehicle: v._id, driver: d._id,
    timeline: [{ status: 'Created', note: 'Shipment created' }, { status: 'Assigned', note: `${v.registrationNo} / ${d.name}` }],
  });
  v.location = { lat: s.pickup.lat, lng: s.pickup.lng };
  v.assignedDriver = d._id;
  d.status = 'on-trip';
  d.assignedVehicle = v._id;
  shipments.push(s);
}

// 2 waiting for assignment, 1 failed
shipments.push(build(5, 'Created'), build(6, 'Created'));
shipments.push(build(7, 'Failed', {
  vehicle: vehicles[5]._id, driver: drivers[5]._id,
  timeline: [{ status: 'Created' }, { status: 'Assigned' }, { status: 'Picked Up' }, { status: 'In Transit' }, { status: 'Failed', note: 'Consignee unavailable' }],
}));

// 12 delivered over the last 7 days (some late so the on-time rate is realistic)
for (let i = 0; i < 12; i++) {
  const ago = i % 7;
  const base = build(i + 8, 'Delivered', {
    vehicle: vehicles[i % 7]._id,
    driver: drivers[i % 6]._id,
    timeline: [{ status: 'Created' }, { status: 'Assigned' }, { status: 'Picked Up' }, { status: 'In Transit' }, { status: 'Delivered' }],
  });
  const deliveredAt = days(ago + 0.05 * i);
  base.deliveredAt = deliveredAt;
  base.eta = i % 4 === 3 ? new Date(deliveredAt.getTime() - 45 * 60000) : new Date(deliveredAt.getTime() + 60 * 60000);
  shipments.push(base);
}

await Promise.all([...vehicles.map((v) => v.save()), ...drivers.map((d) => d.save())]);
await Shipment.create(shipments);

await Alert.create([
  { type: 'speeding', severity: 'warning', message: 'HR38AB1002 is travelling at 92 km/h', vehicle: vehicles[1]._id },
  { type: 'document_expiry', severity: 'warning', message: 'Insurance for HR55CD2003 expires in 12 days', vehicle: vehicles[2]._id },
  { type: 'delivery_failed', severity: 'critical', message: 'Delivery failed: Consignee unavailable', vehicle: vehicles[5]._id },
]);

console.log('Seeded: 3 users, 8 vehicles, 7 drivers, %d shipments, 3 alerts', shipments.length);
console.log('Login: admin@fleet.com / Admin@123');
await mongoose.disconnect();
