import http from 'node:http';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import app from './app.js';
import { initSockets } from './sockets/tracking.js';

await connectDB();
const server = http.createServer(app);
initSockets(server);
server.listen(env.port, () => console.log(`API + sockets listening on http://localhost:${env.port}/api/v1`));

const shutdown = async (signal) => {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await mongoose.disconnect();
    process.exit(0);
  });
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
