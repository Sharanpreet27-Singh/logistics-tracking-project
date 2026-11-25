import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { SHIPMENT_STATUSES } from './constants.js';
import { idColumn } from './id.js';

export const Shipment = sequelize.define('Shipment', {
  _id: idColumn(),
  trackingId: { type: DataTypes.STRING(19), allowNull: false, unique: true },
  customerName: { type: DataTypes.STRING(80), allowNull: false },
  customerPhone: DataTypes.STRING(24),
  pickup: { type: DataTypes.JSON, allowNull: false },
  delivery: { type: DataTypes.JSON, allowNull: false },
  weightKg: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
  status: { type: DataTypes.ENUM(...SHIPMENT_STATUSES), allowNull: false, defaultValue: 'Created' },
  vehicle: DataTypes.STRING(36),
  driver: DataTypes.STRING(36),
  distanceKm: { type: DataTypes.DOUBLE, allowNull: false, defaultValue: 0 },
  eta: DataTypes.DATE(3),
  deliveredAt: DataTypes.DATE(3),
  timeline: { type: DataTypes.JSON, allowNull: false, defaultValue: () => [] },
  createdBy: DataTypes.STRING(36),
}, {
  tableName: 'shipments',
  indexes: [{ fields: ['status', 'deliveredAt'] }, { fields: ['vehicle', 'status'] }, { fields: ['driver', 'status'] }, { fields: ['createdAt'] }],
});
