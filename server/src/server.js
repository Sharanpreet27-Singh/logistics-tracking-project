import http from 'node:http';
import { env } from './config/env.js';
import { checkSchema, connectDB, sequelize } from './config/db.js';
import app from './app.js';
import { initSockets } from './sockets/tracking.js';

try {
  await connectDB();
  await checkSchema();
} catch (error) {
  await sequelize.close();
  throw error;
}
const server = http.createServer(app);
const io = initSockets(server);
server.listen({ port: env.port, host: env.host }, () => console.log(`API + sockets listening on http://localhost:${env.port}/api/v1`));

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down`);
  await io.close();
  await sequelize.close();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
