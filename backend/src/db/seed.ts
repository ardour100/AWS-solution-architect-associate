import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db, pool } from './index.js';
import { users } from './schema.js';

/**
 * Idempotent dev seed: ensures the test admin account exists.
 * Practice/exam endpoints are anonymous, so this is the only account
 * the frontend needs — it is used to manage the question bank.
 *
 *   npm run db:seed
 *
 * Override via SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars.
 */
const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
const password = process.env.SEED_ADMIN_PASSWORD ?? 'admin1234';

const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
if (existing) {
  await db.update(users).set({ role: 'admin' }).where(eq(users.id, existing.id));
  console.log(`[seed] ${email} already exists — role set to admin`);
} else {
  await db.insert(users).values({
    email,
    passwordHash: await bcrypt.hash(password, 10),
    role: 'admin',
  });
  console.log(`[seed] created admin account ${email}`);
}

await pool.end();
