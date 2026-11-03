import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loginSchema } from '../validators/schemas.js';

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

function signTokens(user) {
  const accessToken = jwt.sign({ role: user.role, name: user.name }, env.accessSecret, {
    subject: user.id,
    expiresIn: env.accessExpires,
  });
  const refreshToken = jwt.sign({}, env.refreshSecret, { subject: user.id, expiresIn: env.refreshExpires });
  return { accessToken, refreshToken };
}

export const login = asyncHandler(async (req, res) => {
  const { email, password } = loginSchema.parse(req.body);
  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !user.isActive || !(await user.verifyPassword(password))) {
    throw new ApiError(401, 'Incorrect email or password');
  }
  user.lastLogin = new Date();
  await user.save();
  res.json({ success: true, data: { user: publicUser(user), ...signTokens(user) } });
});

export const refresh = asyncHandler(async (req, res) => {
  const token = req.body?.refreshToken;
  if (!token) throw new ApiError(400, 'refreshToken is required');
  let payload;
  try {
    payload = jwt.verify(token, env.refreshSecret);
  } catch {
    throw new ApiError(401, 'Refresh token is invalid or expired');
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.isActive) throw new ApiError(401, 'Account not available');
  res.json({ success: true, data: signTokens(user) });
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ success: true, data: publicUser(user) });
});

// Tokens are stateless; the client discards them. A token deny-list can be added here (see roadmap).
export const logout = (_req, res) => res.json({ success: true, message: 'Logged out' });
