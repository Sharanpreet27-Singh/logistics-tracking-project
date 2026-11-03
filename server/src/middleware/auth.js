import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

export function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Authentication required');
  try {
    const payload = jwt.verify(token, env.accessSecret);
    req.user = { id: payload.sub, role: payload.role, name: payload.name };
    next();
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }
}

export const authorize =
  (...roles) =>
  (req, _res, next) => {
    if (!roles.includes(req.user?.role)) throw new ApiError(403, 'You do not have permission to do this');
    next();
  };
