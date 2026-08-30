import cors from 'cors';
import { sql } from 'drizzle-orm';
import express, { type NextFunction, type Request, type Response } from 'express';
import { ApiError } from './auth/errors.js';
import authRouter from './auth/router.js';
import { db } from './db/index.js';
import examsRouter from './exams/router.js';
import questionsRouter from './questions/router.js';

export const app = express();

// CORS: the API is public (anonymous practice), so any origin is allowed
// by default. Restrict via CORS_ORIGIN (comma-separated) when deployed,
// e.g. CORS_ORIGIN=https://my-app.vercel.app
const corsOrigins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: corsOrigins.length > 0 ? corsOrigins : true }));

app.use(express.json());

const healthHandler = async (_req: Request, res: Response) => {
  try {
    await db.execute(sql`select 1`);
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('[health] database check failed:', error);
    res.status(503).json({ status: 'degraded', database: 'disconnected' });
  }
};

// Local / container health check, and the Vercel-friendly variant under
// the /api prefix (the /api rewrite is the proven path into the function).
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

app.use('/api/auth', authRouter);
app.use('/api/questions', questionsRouter);
app.use('/api/exams', examsRouter);

// JSON error handler. Express 5 forwards rejected promises from async
// handlers here automatically; body-parser errors carry an HTTP status too.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof ApiError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  const status = typeof (err as { status?: unknown })?.status === 'number' ? (err as { status: number }).status : 500;
  if (status >= 500) {
    console.error('[error] unhandled:', err);
  }
  res.status(status).json({ error: status >= 500 ? 'Internal server error' : (err as Error).message });
});
