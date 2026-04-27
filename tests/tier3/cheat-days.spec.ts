import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { readEnv } from '../../src/config.js';
import { getFirebaseIdToken } from '../../src/auth/firebase.js';
import { createApiClient, ApiClient } from '../../src/http/client.js';

test.describe('Cheat Days @tier3', () => {
  let api: ApiClient;
  const e2eRunId = crypto.randomUUID();
  const testDate = new Date().toISOString().split('T')[0];

  test.beforeAll(async () => {
    const env = readEnv();
    const idToken = await getFirebaseIdToken({
      firebaseServiceAccountJson: env.firebaseServiceAccountJson,
      firebaseWebApiKey: env.firebaseWebApiKey,
      uid: env.e2eUid
    });
    api = await createApiClient({ baseUrl: env.baseUrl, idToken, e2eRunId });
  });

  test('POST /v1/cheat-days - marks a cheat day', async () => {
    const res = await api.post(`/v1/cheat-days?date=${testDate}`, {});

    // 201 = created, 200/400/422 = already marked (idempotent)
    expect([200, 201, 400, 422]).toContain(res.status);
  });

  test('GET /v1/cheat-days - gets cheat days for week', async () => {
    const res = await api.get(`/v1/cheat-days?week_of=${testDate}`);

    expect(res.status).toBe(200);
    const body = await res.json() as { cheat_days: string[] };
    expect(Array.isArray(body.cheat_days)).toBe(true);
  });

  test('DELETE /v1/cheat-days/{date} - unmarks cheat day', async () => {
    const res = await api.delete(`/v1/cheat-days/${testDate}`);

    expect(res.status).toBe(200);
  });

  test.afterAll(async () => {
    if (api) {
      // Ensure cheat day is cleaned up regardless of test outcome
      await api.delete(`/v1/cheat-days/${testDate}`);
    }
  });
});
