import { UniqueConstraintError } from 'sequelize';
import { z } from 'zod';
import { checkSchema, connectDB, sequelize } from '../config/db.js';
import { User } from '../models/index.js';
import { loginSchema } from '../validators/schemas.js';

const adminSchema = z.object({
  ADMIN_NAME: z.string().trim().min(1).max(255),
  ADMIN_EMAIL: loginSchema.shape.email.toLowerCase(),
  ADMIN_PASSWORD: z.string().min(15).refine(
    (password) => password.trim().length > 0 && Buffer.byteLength(password, 'utf8') <= 72,
    'Use a non-blank password of at most 72 UTF-8 bytes.'
  ),
});

const credentials = adminSchema.safeParse(process.env);
if (!credentials.success) {
  for (const issue of credentials.error.issues) console.error(`${issue.path[0]}: ${issue.message}`);
  process.exitCode = 1;
} else {
  const { ADMIN_NAME: name, ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = credentials.data;

  try {
    await connectDB();
    await checkSchema();
    const passwordHash = await User.hash(password);
    await User.create({ name, email, passwordHash, role: 'admin' });
    console.log('Admin account created. Remove the one-time ADMIN_* settings from server/.env.');
  } catch (error) {
    if (!(error instanceof UniqueConstraintError)) throw error;
    console.error('An account with this email already exists.');
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}
