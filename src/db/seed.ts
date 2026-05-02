import crypto from 'node:crypto';
import { getPool, closePool } from './connection.js';

export type SeedOptions = {
  databaseUrl: string;
  firebaseUid: string;
  email?: string;
  displayName?: string;
};

export async function seedTestUser(options: SeedOptions): Promise<void> {
  const { databaseUrl, firebaseUid, email, displayName } = options;
  const resolvedEmail = email ?? `${firebaseUid}@e2e-test.local`;
  const resolvedName = displayName ?? 'E2E Test User';
  const username = `e2e_${firebaseUid}`;
  const dummyPasswordHash = '$2b$12$dummy.hash.for.e2e.testing.only';
  const id = crypto.randomUUID();

  const pool = getPool(databaseUrl);

  try {
    await pool.query(
      `INSERT INTO users (
         id, firebase_uid, email, username, password_hash, display_name,
         provider, is_active, onboarding_completed, last_accessed,
         timezone, language_code, created_at, updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, 'google', true, false, NOW(), 'UTC', 'en', NOW(), NOW())
       ON CONFLICT (firebase_uid) DO UPDATE
         SET email        = EXCLUDED.email,
             display_name = EXCLUDED.display_name,
             updated_at   = NOW()`,
      [id, firebaseUid, resolvedEmail, username, dummyPasswordHash, resolvedName]
    );
    console.log(`Seeded test user: firebase_uid=${firebaseUid}, email=${resolvedEmail}`);
  } finally {
    await closePool();
  }
}

// Allow running as a standalone script: tsx src/db/seed.ts
if (process.argv[1] && process.argv[1].includes('seed')) {
  const databaseUrl = (process.env.DATABASE_URL ?? '').trim();
  const firebaseUid = (process.env.E2E_UID ?? 'e2e-bot').trim();

  if (!databaseUrl) {
    console.error('Error: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  seedTestUser({ databaseUrl, firebaseUid })
    .then(() => {
      console.log('Seed complete');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
