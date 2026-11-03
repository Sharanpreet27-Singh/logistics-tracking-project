import 'dotenv/config';

const get = (key, fallback) => process.env[key] ?? fallback;

export const env = {
  nodeEnv: get('NODE_ENV', 'development'),
  port: Number(get('PORT', 5000)),
  mongoUri: get('MONGO_URI', 'mongodb://localhost:27017/fleet_tracking'),
  accessSecret: get('JWT_ACCESS_SECRET', 'change_me_access'),
  refreshSecret: get('JWT_REFRESH_SECRET', 'change_me_refresh'),
  accessExpires: get('JWT_ACCESS_EXPIRES', '15m'),
  refreshExpires: get('JWT_REFRESH_EXPIRES', '7d'),
  clientUrl: get('CLIENT_URL', 'http://localhost:5173'),
};

if (env.nodeEnv === 'production' && /change_me/.test(env.accessSecret + env.refreshSecret)) {
  throw new Error('Set strong JWT_ACCESS_SECRET and JWT_REFRESH_SECRET before running in production.');
}
