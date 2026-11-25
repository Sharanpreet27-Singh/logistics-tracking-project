import { connectDB, hasDriverAssignmentForeignKey, sequelize } from './db.js';
import '../models/index.js';

try {
  await connectDB();
  await sequelize.sync();

  if (!(await hasDriverAssignmentForeignKey())) {
    await sequelize.getQueryInterface().addConstraint('vehicles', {
      type: 'foreign key',
      name: 'vehicles_assigned_driver_fk',
      fields: ['assignedDriver'],
      references: { table: 'drivers', field: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  }
  console.log('FleetTrack MySQL schema is ready.');
} finally {
  await sequelize.close();
}
