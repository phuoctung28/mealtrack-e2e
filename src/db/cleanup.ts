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
    // First get meal IDs for this user (needed for child tables)
    const mealResult = await pool.query(
      `SELECT meal_id FROM meal WHERE user_id = $1`,
      [userId]
    );
    const mealIds = mealResult.rows.map(r => r.meal_id);

    if (mealIds.length > 0) {
      // Get nutrition IDs for these meals
      const nutritionResult = await pool.query(
        `SELECT id FROM nutrition WHERE meal_id = ANY($1)`,
        [mealIds]
      );
      const nutritionIds = nutritionResult.rows.map(r => r.id);

      // Delete in FK order: food_item -> nutrition -> meal
      if (nutritionIds.length > 0) {
        const foodRes = await pool.query(
          `DELETE FROM food_item WHERE nutrition_id = ANY($1)`,
          [nutritionIds]
        );
        console.log(`Deleted ${foodRes.rowCount} row(s) from food_item`);
      }

      const nutRes = await pool.query(
        `DELETE FROM nutrition WHERE meal_id = ANY($1)`,
        [mealIds]
      );
      console.log(`Deleted ${nutRes.rowCount} row(s) from nutrition`);

      // Delete other meal-related tables (skip if not exist)
      for (const table of ['meal_translation']) {
        try {
          const res = await pool.query(
            `DELETE FROM ${table} WHERE meal_id = ANY($1)`,
            [mealIds]
          );
          console.log(`Deleted ${res.rowCount} row(s) from ${table}`);
        } catch {
          // Table might not exist - continue
        }
      }
    }

    // Now delete from user-related tables
    const userTables = ['meal', 'user_profiles', 'referral_wallets', 'referral_codes'];
    for (const table of userTables) {
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
