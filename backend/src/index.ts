import { sql } from 'drizzle-orm';
import express from 'express';
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

app.listen(port, () => {
  console.log(`backend listening on http://localhost:${port}`);
});
