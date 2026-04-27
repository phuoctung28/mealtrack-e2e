import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { readEnv } from '../../src/config.js';
import { getFirebaseIdToken } from '../../src/auth/firebase.js';
import { createApiClient, ApiClient } from '../../src/http/client.js';

test.describe('Daily Tracking Flow @tier1', () => {
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

  test('GET /v1/activities/daily - gets daily activities feed', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await api.get(`/v1/activities/daily?date=${today}`);

    expect(res.status).toBe(200);
    // Activities endpoint returns an array directly, not wrapped in { activities: [] }
    const body = await res.json() as Array<{ id: string; type: string; calories: number }>;
    expect(Array.isArray(body)).toBe(true);
  });

  test('GET /v1/meals/daily/macros - gets daily macro summary', async () => {
    const today = new Date().toISOString().split('T')[0];
    const res = await api.get(`/v1/meals/daily/macros?date=${today}`);

    expect(res.status).toBe(200);
    const body = await res.json() as {
      date: string;
      consumed_calories: number;
      target_calories: number;
      consumed_macros: { protein: number; carbs: number; fat: number };
      target_macros: { protein: number; carbs: number; fat: number };
    };
    expect(body.date).toBe(today);
    expect(typeof body.consumed_calories).toBe('number');
    expect(typeof body.target_calories).toBe('number');
  });
});
