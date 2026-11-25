import { readFileSync } from 'node:fs';
import { isIP } from 'node:net';
import { Sequelize } from 'sequelize';
import { env } from './env.js';

const { db } = env;

export const sequelize = new Sequelize(db.name, db.user, db.password, {
  dialect: 'mysql',
  host: db.host,
  port: db.port,
  timezone: '+00:00',
  logging: false,
  pool: { max: 10, min: 0, acquire: 12000 },
  dialectOptions: { connectTimeout: 10000 },
  define: { charset: 'utf8mb4', collate: 'utf8mb4_unicode_ci', engine: 'InnoDB' },
});

sequelize.beforeConnect((config) => {
  if (!db.host || !db.name || !db.user || !db.password) {
    throw new Error('Set DB_HOST, DB_NAME, DB_USER and DB_PASSWORD in server/.env.');
  }
  if (!Number.isInteger(db.port) || db.port < 1 || db.port > 65535) throw new Error('DB_PORT must be a valid port number.');
  if (!db.ssl) {
    if (env.nodeEnv === 'production' || /\.rds\.amazonaws\.com(?:\.cn)?\.?$/i.test(db.host)) {
      throw new Error('Enable DB_SSL for production and Amazon RDS connections.');
    }
    return;
  }
  if (isIP(db.host)) throw new Error('Set DB_HOST to the database hostname for TLS identity verification.');

  let ca;
  try {
    ca = readFileSync(db.sslCa, 'utf8');
  } catch (error) {
    throw new Error('Could not read the CA certificate specified by DB_SSL_CA.', { cause: error });
  }
  config.dialectOptions = { ...config.dialectOptions, ssl: { ca, rejectUnauthorized: true, verifyIdentity: true, minVersion: 'TLSv1.2' } };
});

export async function connectDB() {
  await sequelize.authenticate();
  console.log(`MySQL connected: ${db.host}:${db.port}/${db.name}`);
}

export async function hasDriverAssignmentForeignKey() {
  const keys = await sequelize.getQueryInterface().getForeignKeyReferencesForTable('vehicles');
  return keys.some((key) => key.columnName === 'assignedDriver' && key.referencedTableName === 'drivers');
}

export async function checkSchema() {
  const tables = new Set(await sequelize.getQueryInterface().showAllTables());
  if (Object.values(sequelize.models).some((model) => !tables.has(model.tableName)) || !(await hasDriverAssignmentForeignKey())) {
    throw new Error('FleetTrack MySQL schema is incomplete. Run npm run db:init from the project root.');
  }
}
