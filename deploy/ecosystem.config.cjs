// PM2 process file. MySQL settings and other secrets come from server/.env.
const path = require('node:path');
const server = path.join(__dirname, '..', 'server');

module.exports = {
  apps: [
    {
      name: 'fleettrack-api',
      cwd: server,
      script: 'src/server.js',
      env: { NODE_ENV: 'production', SERVE_CLIENT: 'true', TRUST_PROXY: '1' },
      max_memory_restart: '400M',
      time: true,
    },
    // Demo traffic: keeps a few trucks moving on a demo instance. Start it with
    //   pm2 start deploy/ecosystem.config.cjs --only fleettrack-simulator
    {
      name: 'fleettrack-simulator',
      cwd: server,
      script: 'src/simulator/simulate.js',
      args: '--auto --interval=3000 --speedup=20',
      env: { NODE_ENV: 'production', API_URL: 'http://127.0.0.1:5000' },
      autorestart: true,
      restart_delay: 10000,
      time: true,
    },
  ],
};
