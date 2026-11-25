import { User } from './User.js';
import { Vehicle } from './Vehicle.js';
import { Driver } from './Driver.js';
import { Shipment } from './Shipment.js';
import { Alert } from './Alert.js';

function link(source, target, foreignKey, options = {}) {
  source.belongsTo(target, { as: `${foreignKey}Record`, foreignKey, onDelete: 'SET NULL', onUpdate: 'CASCADE', ...options });
}

// db:init adds this side of the circular assignment after both tables exist.
link(Vehicle, Driver, 'assignedDriver', { constraints: false });
link(Driver, Vehicle, 'assignedVehicle');
link(Shipment, Vehicle, 'vehicle');
link(Shipment, Driver, 'driver');
link(Shipment, User, 'createdBy');
link(Alert, Vehicle, 'vehicle');
link(Alert, Shipment, 'shipment');

export { User, Vehicle, Driver, Shipment, Alert };

export function serialize(row) {
  const fields = row.get({ plain: true });
  for (const { as, foreignKey } of Object.values(row.constructor.associations)) {
    if (Object.hasOwn(fields, as)) {
      fields[foreignKey] = fields[as];
      delete fields[as];
    }
  }
  return fields;
}
