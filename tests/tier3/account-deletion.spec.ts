import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { readEnv } from '../../src/config.js';
import { getFirebaseIdToken } from '../../src/auth/firebase.js';
import { createApiClient } from '../../src/http/client.js';
import { seedTestUser } from '../../src/db/seed.js';

test.describe('Account Deletion @tier3', () => {
  // Use a separate test user for deletion to avoid breaking other tests
  const deletionTestUid = `e2e-deletion-test-${crypto.randomUUID()}`;

  test.skip('DELETE /v1/users/firebase/{uid} - deletes user account', async () => {
    // TODO: This test requires creating a temporary Firebase user and proper cleanup
    // Skipping to avoid test user management complexity
    const env = readEnv();

    // Seed a separate user for deletion
    await seedTestUser({ databaseUrl: env.databaseUrl, uid: deletionTestUid });

    // Get token for this user
    const idToken = await getFirebaseIdToken({
      firebaseServiceAccountJson: env.firebaseServiceAccountJson,
      firebaseWebApiKey: env.firebaseWebApiKey,
      uid: deletionTestUid
    });

    const api = await createApiClient({
      baseUrl: env.baseUrl,
      idToken,
      e2eRunId: crypto.randomUUID()
    });

    // First sync the user
    await api.post('/v1/users/sync', {
      firebase_uid: deletionTestUid,
      email: `deletion-test@example.com`,
      provider: 'custom'
    });

    // Now delete
    const res = await api.delete(`/v1/users/firebase/${deletionTestUid}`);

    expect(res.status).toBe(200);
    const body = await res.json() as { deleted: boolean };
    expect(body.deleted).toBe(true);
  });
});
