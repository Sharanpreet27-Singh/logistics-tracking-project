import { DataTypes } from 'sequelize';

export const idColumn = () => ({
  type: DataTypes.STRING(36),
  field: 'id',
  primaryKey: true,
  defaultValue: DataTypes.UUIDV4,
});
