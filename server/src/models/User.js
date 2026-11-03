import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES } from './constants.js';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'dispatcher' },
    isActive: { type: Boolean, default: true },
    lastLogin: Date,
  },
  { timestamps: true }
);

userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};
userSchema.statics.hash = (plain) => bcrypt.hash(plain, 12);

export const User = mongoose.model('User', userSchema);
