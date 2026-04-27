import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { readEnv } from '../../src/config.js';
import { getFirebaseIdToken } from '../../src/auth/firebase.js';
import { createApiClient } from '../../src/http/client.js';

test('staging auth smoke @e2e', async () => {
  const env = readEnv();
  const e2eRunId = crypto.randomUUID();

  const idToken = await getFirebaseIdToken({
    firebaseServiceAccountJson: env.firebaseServiceAccountJson,
    firebaseWebApiKey: env.firebaseWebApiKey,
    uid: env.e2eUid
  });

  const api = await createApiClient({ baseUrl: env.baseUrl, idToken, e2eRunId });

  // Minimal signal test: ensure JWT is accepted by backend.
  // Update the path once we confirm the canonical "me/profile" endpoint.
  const res = await api.get('/health');
  expect(res.status).toBeGreaterThanOrEqual(200);
  expect(res.status).toBeLessThan(500);
});

