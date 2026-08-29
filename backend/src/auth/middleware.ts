import type { NextFunction, Request, Response } from 'express';
import { verifyToken, type JwtPayload } from './token.js';

/** Mounted on req by authenticateToken; consumed by route handlers. */
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * Parses `Authorization: Bearer <token>`, verifies signature and expiry,
 * and mounts `req.user`. Responds 401 on missing/malformed/invalid/expired
 * tokens.
 */
export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  if (!token) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    // Covers expired tokens (TokenExpiredError) and invalid signatures.
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Requires a valid token AND role === 'admin'; non-admins get 403. */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  authenticateToken(req, res, () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  });
}
