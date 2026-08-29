import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { users, type User } from '../db/schema.js';
import { ApiError } from './errors.js';
import { signToken, type JwtPayload } from './token.js';

const BCRYPT_ROUNDS = 10;

/** User shape returned to clients — never includes password_hash. */
export interface PublicUser {
  id: string;
  email: string;
  role: string;
  createdAt: Date;
}

export interface AuthResult {
  token: string;
  user: PublicUser;
}

function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
  };
}

function toAuthResult(user: User): AuthResult {
  return {
    token: signToken({ userId: user.id, role: user.role as JwtPayload['role'] }),
    user: toPublicUser(user),
  };
}

/** Hashes the password, creates the user, and returns a fresh token. */
export async function register(email: string, password: string): Promise<AuthResult> {
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    throw new ApiError(409, 'Email is already registered');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  let user: User;
  try {
    [user] = await db.insert(users).values({ email, passwordHash }).returning();
  } catch (error) {
    // Race between the pre-check and the insert: the unique index wins.
    if ((error as { code?: string }).code === '23505') {
      throw new ApiError(409, 'Email is already registered');
    }
    throw error;
  }

  return toAuthResult(user);
}

/** Verifies the credentials and returns a fresh token on success. */
export async function login(email: string, password: string): Promise<AuthResult> {
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // Same error for unknown email and wrong password — don't leak which one.
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  return toAuthResult(user);
}
