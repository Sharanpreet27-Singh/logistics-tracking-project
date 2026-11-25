import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { ALERT_TYPES } from './constants.js';
import { idColumn } from './id.js';

export const Alert = sequelize.define('Alert', {
  _id: idColumn(),
  type: { type: DataTypes.ENUM(...ALERT_TYPES), allowNull: false },
  severity: { type: DataTypes.ENUM('info', 'warning', 'critical'), allowNull: false, defaultValue: 'warning' },
  message: { type: DataTypes.TEXT, allowNull: false },
  vehicle: DataTypes.STRING(36),
  shipment: DataTypes.STRING(36),
  isRead: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'alerts', indexes: [{ fields: ['isRead', 'createdAt'] }, { fields: ['vehicle', 'type', 'createdAt'] }] });
