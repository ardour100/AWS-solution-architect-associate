import { z } from 'zod';

/**
 * Strict request-body schemas (zod v4). `.strict()` rejects unknown keys,
 * so clients can't smuggle extra fields (e.g. `role` on register).
 */

// bcrypt only uses the first 72 bytes of input, so cap the length.
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .max(72, 'Password must be at most 72 characters long')
  .regex(/[A-Za-z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const email = z.string().trim().toLowerCase().pipe(z.email('Invalid email address'));

export const registerSchema = z
  .object({
    email,
    password,
  })
  .strict();

export const loginSchema = z
  .object({
    email,
    password: z.string().min(1, 'Password is required'),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
