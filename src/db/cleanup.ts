import { getPool, closePool } from './connection.js';

export type CleanupOptions = {
  databaseUrl: string;
  firebaseUid: string;
};

export async function cleanupTestData(options: CleanupOptions): Promise<void> {
  const { databaseUrl, firebaseUid } = options;
  const pool = getPool(databaseUrl);

  try {
    // Delete test user by firebase_uid (more reliable than email).
    // Cascades handle related rows (meals, profiles, etc.)
    const result = await pool.query(
      `DELETE FROM users WHERE firebase_uid = $1`,
      [firebaseUid]
    );
    console.log(`Deleted ${result.rowCount} test user(s) with firebase_uid '${firebaseUid}'`);
  } finally {
    await closePool();
  }
}

// Allow running as a standalone script: ts-node --esm src/db/cleanup.ts
if (process.argv[1] && process.argv[1].includes('cleanup')) {
  const databaseUrl = (process.env.DATABASE_URL ?? '').trim();
  const firebaseUid = (process.env.E2E_UID ?? '').trim();

  if (!databaseUrl) {
    console.error('Error: DATABASE_URL environment variable is required');
    process.exit(1);
  }
  if (!firebaseUid) {
    console.error('Error: E2E_UID environment variable is required');
    process.exit(1);
  }

  cleanupTestData({ databaseUrl, firebaseUid })
    .then(() => {
      console.log('Cleanup complete');
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error('Cleanup failed:', err);
      process.exit(1);
    });
}
