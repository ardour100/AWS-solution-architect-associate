import jwt from 'jsonwebtoken';

/** Claims carried by every access token we issue. */
export interface JwtPayload {
  userId: string;
  role: 'user' | 'admin';
}

const jwtSecret = process.env.JWT_SECRET ?? 'dev-secret-change-me';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? '7d';

if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('[auth] JWT_SECRET is not set — using an insecure dev secret');
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, jwtSecret, {
    expiresIn: jwtExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Verifies the signature and expiry, and only accepts tokens whose payload
 * carries the claims we issue. Throws on invalid/expired tokens — callers
 * translate that into a 401.
 */
export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, jwtSecret);
  if (
    typeof decoded === 'string' ||
    typeof decoded.userId !== 'string' ||
    typeof decoded.role !== 'string'
  ) {
    throw new Error('Token payload is missing required claims');
  }
  return { userId: decoded.userId, role: decoded.role as JwtPayload['role'] };
}
