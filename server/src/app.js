import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

// The built client lives in client/dist. In production the API can serve it, so one process
// (plus Nginx in front) is the whole deployment.
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
const hasBuild = fs.existsSync(path.join(clientDist, 'index.html'));
export const serveClient = env.serveClient === 'true' || (env.serveClient === 'auto' && env.nodeEnv === 'production' && hasBuild);
if (env.serveClient === 'true' && !hasBuild) console.warn(`SERVE_CLIENT=true but no build found at ${clientDist}. Run "npm run build" in client/.`);

const app = express();
if (env.trustProxy) app.set('trust proxy', env.trustProxy);

app.use(
  helmet(
    serveClient
      ? {
          // The client loads fonts from Google and map tiles from Esri / OpenStreetMap; keep the rest locked down.
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
              fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
              imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
              connectSrc: ["'self'", 'ws:', 'wss:'],
              workerSrc: ["'self'", 'blob:'],
              objectSrc: ["'none'"],
              'upgrade-insecure-requests': null, // the site may run on plain http:// (EC2 IP) before a certificate exists
            },
          },
        }
      : {}
  )
);
app.use(cors({ origin: env.clientUrls, credentials: true }));
app.use(express.json({ limit: '100kb' }));
if (env.nodeEnv !== 'test') app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use('/api/v1', routes);

if (serveClient) {
  // Hashed assets can be cached for a year; index.html must always be fresh.
  app.use(express.static(clientDist, { index: false, maxAge: '1y', setHeaders: (res, file) => { if (file.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache'); } }));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html'), { headers: { 'Cache-Control': 'no-cache' } }));
}

app.use(notFound);
app.use(errorHandler);

export default app;
