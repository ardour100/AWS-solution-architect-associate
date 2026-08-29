import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db, pool } from './index.js';

/**
 * Applies pending SQL migrations from the `drizzle/` folder (relative to
 * the process cwd). Uses the compiled migrator so the production image
 * doesn't need drizzle-kit; for local dev, `npm run db:migrate` runs the
 * same migrations through drizzle-kit.
 */
await migrate(db, { migrationsFolder: './drizzle' });
await pool.end();
