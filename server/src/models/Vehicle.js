import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { env } from '../config/env.js';
import { VEHICLE_TYPES, FUEL_TYPES, VEHICLE_STATUSES } from './constants.js';
import { idColumn } from './id.js';

export const Vehicle = sequelize.define('Vehicle', {
  _id: idColumn(),
  registrationNo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  type: { type: DataTypes.ENUM(...VEHICLE_TYPES), allowNull: false },
  make: DataTypes.STRING(40),
  model: DataTypes.STRING(40),
  capacityKg: { type: DataTypes.DOUBLE, allowNull: false },
  fuelType: { type: DataTypes.ENUM(...FUEL_TYPES), allowNull: false, defaultValue: 'Diesel' },
  status: { type: DataTypes.ENUM(...VEHICLE_STATUSES), allowNull: false, defaultValue: 'idle' },
  assignedDriver: DataTypes.STRING(36),
  location: { type: DataTypes.JSON, defaultValue: () => env.demoMode ? { lat: 28.6139, lng: 77.209 } : null },
  speed: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
  heading: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
  lastUpdated: DataTypes.DATE(3),
  nextServiceDate: DataTypes.DATE,
  insuranceExpiry: DataTypes.DATE,
}, { tableName: 'vehicles', indexes: [{ fields: ['status', 'type'] }] });
