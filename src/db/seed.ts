import { getPool, closePool } from './connection.js';

export type SeedOptions = {
  databaseUrl: string;
  uid: string;
  email?: string;
  displayName?: string;
};

export async function seedTestUser(options: SeedOptions): Promise<void> {
  const { databaseUrl, uid, email, displayName } = options;
  const resolvedEmail = email ?? `${uid}@e2e-test.local`;
  const resolvedName = displayName ?? 'E2E Test User';

  const pool = getPool(databaseUrl);

  try {
    await pool.query(
      `INSERT INTO users (uid, email, display_name, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       ON CONFLICT (uid) DO UPDATE
         SET email        = EXCLUDED.email,
             display_name = EXCLUDED.display_name,
             updated_at   = NOW()`,
      [uid, resolvedEmail, resolvedName]
    );
    console.log(`Seeded test user: uid=${uid}, email=${resolvedEmail}`);
  } finally {
    await closePool();
  }
}

// Allow running as a standalone script: ts-node --esm src/db/seed.ts
if (process.argv[1] && process.argv[1].includes('seed')) {
  const databaseUrl = (process.env.DATABASE_URL ?? '').trim();
  const uid = (process.env.E2E_UID ?? 'e2e-bot').trim();

  if (!databaseUrl) {
    console.error('Error: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  seedTestUser({ databaseUrl, uid })
    .then(() => {
      console.log('Seed complete');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
