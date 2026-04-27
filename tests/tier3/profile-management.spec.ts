import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { readEnv } from '../../src/config.js';
import { getFirebaseIdToken } from '../../src/auth/firebase.js';
import { createApiClient, ApiClient } from '../../src/http/client.js';

test.describe('Profile Management @tier3', () => {
  let api: ApiClient;
  const e2eRunId = crypto.randomUUID();

  test.beforeAll(async () => {
    const env = readEnv();
    const idToken = await getFirebaseIdToken({
      firebaseServiceAccountJson: env.firebaseServiceAccountJson,
      firebaseWebApiKey: env.firebaseWebApiKey,
      uid: env.e2eUid
    });
    api = await createApiClient({ baseUrl: env.baseUrl, idToken, e2eRunId });
  });

  test('GET /v1/user-profiles/tdee - gets TDEE calculation', async () => {
    const res = await api.get('/v1/user-profiles/tdee');

    expect(res.status).toBe(200);
    const body = await res.json() as { tdee: number; bmr: number; macros: unknown };
    expect(body.tdee).toBeGreaterThan(0);
    expect(body.bmr).toBeGreaterThan(0);
  });

  test('POST /v1/user-profiles/metrics - updates user metrics', async () => {
    const res = await api.post('/v1/user-profiles/metrics', {
      weight_kg: 72,
      activity_level: 'active'
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { tdee: number };
    expect(body.tdee).toBeGreaterThan(0);
  });

  test('PUT /v1/user-profiles/custom-macros - sets custom macros', async () => {
    const res = await api.put('/v1/user-profiles/custom-macros', {
      calories: 2200,
      protein_g: 180,
      carbs_g: 220,
      fat_g: 70
    });

    expect(res.status).toBe(200);
  });

  test('PUT /v1/users/timezone - updates timezone', async () => {
    const res = await api.put('/v1/users/timezone', {
      timezone: 'America/Los_Angeles'
    });

    expect(res.status).toBe(200);
  });
});
