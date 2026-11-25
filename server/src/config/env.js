import 'dotenv/config';

const get = (key, fallback) => process.env[key] ?? fallback;
const list = (value) => String(value).split(',').map((s) => s.trim()).filter(Boolean);
const flag = (value) => !['', '0', 'false', 'no', 'off'].includes(String(value).toLowerCase());

const clientUrl = get('CLIENT_URL', 'http://localhost:5173');

export const env = {
  nodeEnv: get('NODE_ENV', 'development'),
  port: Number(get('PORT', 5000)),
  host: get('HOST', undefined),
  db: {
    host: get('DB_HOST', ''),
    port: Number(get('DB_PORT', 3306)),
    name: get('DB_NAME', 'fleet_tracking'),
    user: get('DB_USER', ''),
    password: get('DB_PASSWORD', ''),
    ssl: flag(get('DB_SSL', 'true')),
    sslCa: get('DB_SSL_CA', 'certs/rds-global-bundle.pem'),
  },
  demoMode: get('DEMO_MODE', 'false').trim().toLowerCase() === 'true',
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

if (env.nodeEnv === 'production') {
  const secrets = [env.accessSecret, env.refreshSecret];
  if (secrets.some((secret) => secret.trim().length < 32 || /change_me|replace_with/i.test(secret)) || env.accessSecret === env.refreshSecret) {
    throw new Error('Set two distinct JWT secrets of at least 32 characters before running in production.');
  }
}
