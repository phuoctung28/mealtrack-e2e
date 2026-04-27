import { getPool, closePool } from './connection.js';

const E2E_EMAIL_PATTERN = '%@e2e-test.local';

export async function cleanupTestData(databaseUrl: string): Promise<void> {
  const pool = getPool(databaseUrl);

  try {
    // Delete all test users and let cascades handle related rows.
    // The pattern matches any email ending with @e2e-test.local.
    const result = await pool.query(
      `DELETE FROM users WHERE email LIKE $1`,
      [E2E_EMAIL_PATTERN]
    );
    console.log(`Deleted ${result.rowCount} test user(s) matching '${E2E_EMAIL_PATTERN}'`);
  } finally {
    await closePool();
  }
}

// Allow running as a standalone script: ts-node --esm src/db/cleanup.ts
if (process.argv[1] && process.argv[1].includes('cleanup')) {
  const databaseUrl = (process.env.DATABASE_URL ?? '').trim();
  if (!databaseUrl) {
    console.error('Error: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  cleanupTestData(databaseUrl)
    .then(() => {
      console.log('Cleanup complete');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('Cleanup failed:', err);
      process.exit(1);
    });
}
