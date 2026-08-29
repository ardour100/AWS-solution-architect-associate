import { sql } from 'drizzle-orm';
import express, { type NextFunction, type Request, type Response } from 'express';
import { ApiError } from './auth/errors.js';
import authRouter from './auth/router.js';
import { db } from './db/index.js';

const app = express();
const port = Number(process.env.PORT ?? 8080);

app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    await db.execute(sql`select 1`);
    res.json({ status: 'ok', database: 'connected' });
  } catch (error) {
    console.error('[health] database check failed:', error);
    res.status(503).json({ status: 'degraded', database: 'disconnected' });
  }
});

app.use('/api/auth', authRouter);

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

app.listen(port, () => {
  console.log(`backend listening on http://localhost:${port}`);
});
