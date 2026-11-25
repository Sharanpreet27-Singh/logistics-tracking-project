import bcrypt from 'bcryptjs';
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import { ROLES } from './constants.js';
import { idColumn } from './id.js';

export const User = sequelize.define('User', {
  _id: idColumn(),
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING(254), allowNull: false, unique: true },
  passwordHash: { type: DataTypes.STRING(60), allowNull: false },
  role: { type: DataTypes.ENUM(...ROLES), allowNull: false, defaultValue: 'dispatcher' },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  lastLogin: DataTypes.DATE(3),
}, {
  tableName: 'users',
  defaultScope: { attributes: { exclude: ['passwordHash'] } },
});

User.hash = (password) => bcrypt.hash(password, 12);
User.prototype.verifyPassword = function (password) {
  return bcrypt.compare(password, this.passwordHash);
};
