import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { readEnv } from '../../src/config.js';
import { getFirebaseIdToken } from '../../src/auth/firebase.js';
import { createApiClient, ApiClient } from '../../src/http/client.js';

test.describe('Progress Tracking @tier3', () => {
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

  test('GET /v1/meals/streak - gets logging streak', async () => {
    const res = await api.get('/v1/meals/streak');

    expect(res.status).toBe(200);
    const body = await res.json() as { current_streak: number; best_streak: number };
    expect(body.current_streak).toBeGreaterThanOrEqual(0);
    expect(body.best_streak).toBeGreaterThanOrEqual(0);
  });

  test('GET /v1/meals/weekly/daily-breakdown - gets weekly breakdown', async () => {
    const monday = getMonday(new Date()).toISOString().split('T')[0];
    const res = await api.get(`/v1/meals/weekly/daily-breakdown?week_start=${monday}`);

    expect(res.status).toBe(200);
    const body = await res.json() as { days: Array<{ date: string }> };
    expect(body.days.length).toBe(7);
  });

  test('GET /v1/meals/weekly/budget - gets weekly budget', async () => {
    const monday = getMonday(new Date()).toISOString().split('T')[0];
    const res = await api.get(`/v1/meals/weekly/budget?week_start=${monday}`);

    if (res.status !== 200) {
      console.log('Weekly budget response:', res.status, await res.text());
    }
    expect(res.status).toBe(200);
    const body = await res.json() as {
      week_start_date: string;
      target_calories: number;
      consumed_calories: number;
      remaining_days: number;
      adjusted_daily_calories: number;
    };
    expect(body.remaining_days).toBeGreaterThanOrEqual(0);
    expect(body.adjusted_daily_calories).toBeDefined();
  });
});

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}
