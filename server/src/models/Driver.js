import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { DRIVER_STATUSES } from './constants.js';
import { idColumn } from './id.js';

export const Driver = sequelize.define('Driver', {
  _id: idColumn(),
  name: { type: DataTypes.STRING(80), allowNull: false },
  phone: { type: DataTypes.STRING(24), allowNull: false },
  email: DataTypes.STRING(254),
  licenseNo: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  licenseExpiry: DataTypes.DATE,
  status: { type: DataTypes.ENUM(...DRIVER_STATUSES), allowNull: false, defaultValue: 'available' },
  rating: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 4 },
  assignedVehicle: DataTypes.STRING(36),
}, { tableName: 'drivers', indexes: [{ fields: ['status'] }] });
