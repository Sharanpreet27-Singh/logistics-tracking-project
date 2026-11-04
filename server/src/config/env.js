import 'dotenv/config';

const get = (key, fallback) => process.env[key] ?? fallback;
const list = (value) => String(value).split(',').map((s) => s.trim()).filter(Boolean);
const flag = (value) => !['', '0', 'false', 'no', 'off'].includes(String(value).toLowerCase());

const clientUrl = get('CLIENT_URL', 'http://localhost:5173');

export const env = {
  nodeEnv: get('NODE_ENV', 'development'),
  port: Number(get('PORT', 5000)),
  mongoUri: get('MONGO_URI', 'mongodb://localhost:27017/fleet_tracking'),
  accessSecret: get('JWT_ACCESS_SECRET', 'change_me_access'),
  refreshSecret: get('JWT_REFRESH_SECRET', 'change_me_refresh'),
  accessExpires: get('JWT_ACCESS_EXPIRES', '15m'),
  refreshExpires: get('JWT_REFRESH_EXPIRES', '7d'),
  clientUrl,
  /** Allowed browser origins (CORS + sockets). CLIENT_URL may hold several, comma separated. */
  clientUrls: list(clientUrl),
  /** Serve client/dist from this server: 'true' | 'false' | 'auto' (only in production, when a build exists). */
  serveClient: String(get('SERVE_CLIENT', 'auto')).toLowerCase(),
  /** Express "trust proxy" setting; set to 1 behind Nginx / a load balancer. */
  trustProxy: flag(get('TRUST_PROXY', '0')) ? Number(get('TRUST_PROXY', '1')) || true : false,
};

if (env.nodeEnv === 'production' && /change_me/.test(env.accessSecret + env.refreshSecret)) {
  throw new Error('Set strong JWT_ACCESS_SECRET and JWT_REFRESH_SECRET before running in production.');
}
