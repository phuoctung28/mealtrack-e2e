import { getPool, closePool } from './connection.js';

export type CleanupOptions = {
  databaseUrl: string;
  firebaseUid: string;
};

export async function cleanupTestData(options: CleanupOptions): Promise<void> {
  const { databaseUrl, firebaseUid } = options;
  const pool = getPool(databaseUrl);

  try {
    // Get user_id for cleanup
    const userResult = await pool.query(
      `SELECT id FROM users WHERE firebase_uid = $1`,
      [firebaseUid]
    );

    if (userResult.rows.length === 0) {
      console.log(`No user found with firebase_uid '${firebaseUid}' - nothing to clean`);
      return;
    }

    const userId = userResult.rows[0].id;
    console.log(`Cleaning up data for user_id: ${userId}`);

    // Clean up test data without deleting the user (preserves Redis cache)
    const tablesToClean = [
      'meal',
      'user_profiles',
      'referral_wallets',
      'referral_codes',
    ];

    for (const table of tablesToClean) {
      const res = await pool.query(
        `DELETE FROM ${table} WHERE user_id = $1`,
        [userId]
      );
      console.log(`Deleted ${res.rowCount} row(s) from ${table}`);
    }

    // Reset user state without deleting
    await pool.query(
      `UPDATE users SET onboarding_completed = false, provider = 'GOOGLE' WHERE id = $1`,
      [userId]
    );
    console.log(`Reset user state for firebase_uid '${firebaseUid}'`);
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
