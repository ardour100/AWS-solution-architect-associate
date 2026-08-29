import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

/**
 * Database connection configuration.
 *
 * DATABASE_URL is the single source of truth and is consumed by:
 * - this module (pg Pool + Drizzle),
 * - drizzle.config.ts (migrations, drizzle-kit),
 * - docker-compose (backend service environment).
 */
const defaultConnectionString = 'postgres://appuser:apppassword@localhost:5433/appdb';
const connectionString = process.env.DATABASE_URL ?? defaultConnectionString;

export const pool = new Pool({ connectionString, max: 10 });

export const db = drizzle(pool, { schema });

export { connectionString };
