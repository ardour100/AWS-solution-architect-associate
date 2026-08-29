import type { Request, Response } from 'express';
import type { z } from 'zod';
import { loginSchema, registerSchema } from './schemas.js';
import * as authService from './service.js';

/**
 * Zod failure → 400 with per-field details. Express 5 forwards rejected
 * promises from async handlers to the app-level error handler, so service
 * errors (ApiError) need no try/catch here.
 */
function parse<T>(schema: z.ZodType<T>, req: Request, res: Response): T | undefined {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Invalid request body',
      details: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return undefined;
  }
  return result.data;
}

export async function register(req: Request, res: Response): Promise<void> {
  const body = parse(registerSchema, req, res);
  if (!body) return;
  res.status(201).json(await authService.register(body.email, body.password));
}

export async function login(req: Request, res: Response): Promise<void> {
  const body = parse(loginSchema, req, res);
  if (!body) return;
  res.json(await authService.login(body.email, body.password));
}
