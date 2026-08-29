import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    // Fallback: docker-compose postgres mapped to host port 5433.
    // Inside docker compose the backend overrides DATABASE_URL to point at postgres:5432.
    url: process.env.DATABASE_URL ?? 'postgres://appuser:apppassword@localhost:5433/appdb',
  },
});
