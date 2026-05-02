import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { readEnv } from '../../src/config.js';
import { getFirebaseIdToken } from '../../src/auth/firebase.js';
import { createApiClient, ApiClient } from '../../src/http/client.js';

test.describe.configure({ mode: 'serial' });

test.describe('User Onboarding Flow @tier1', () => {
  let api: ApiClient;
  let env: ReturnType<typeof readEnv>;
  const e2eRunId = crypto.randomUUID();

  test.beforeAll(async () => {
    env = readEnv();

    // NOTE: We don't delete the test user between runs because:
    // 1. Redis caches firebase_uid -> user_id for 10 minutes
    // 2. Direct DB deletion doesn't invalidate the cache
    // 3. Sync will update the existing user, keeping the user_id stable
    //
    // The sync endpoint handles both create and update, so test idempotency is preserved.

    // Get auth token
    const idToken = await getFirebaseIdToken({
      firebaseServiceAccountJson: env.firebaseServiceAccountJson,
      firebaseWebApiKey: env.firebaseWebApiKey,
      uid: env.e2eUid
    });

    api = await createApiClient({ baseUrl: env.baseUrl, idToken, e2eRunId });
  });

  test('POST /v1/users/sync - syncs user from Firebase', async () => {
    const res = await api.post('/v1/users/sync', {
      firebase_uid: env.e2eUid,
      email: 'e2e-test@example.com',
      provider: 'google'
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { user: { id: string }; created: boolean };
    expect(body.user.id).toBeTruthy();
  });

  test('GET /v1/users/firebase/{uid}/status - checks onboarding status', async () => {
    const res = await api.get(`/v1/users/firebase/${env.e2eUid}/status`);

    expect(res.status).toBe(200);
    const body = await res.json() as { onboarding_completed: boolean };
    // Note: For existing users, onboarding_completed may already be true from previous runs.
    // We just verify the field exists and is a boolean.
    expect(typeof body.onboarding_completed).toBe('boolean');
  });

  test('POST /v1/tdee/preview - calculates TDEE preview', async () => {
    const res = await api.post('/v1/tdee/preview', {
      age: 30,
      sex: 'male',
      height: 175,
      weight: 70,
      job_type: 'desk',
      training_days_per_week: 3,
      training_minutes_per_session: 60,
      goal: 'recomp',
      unit_system: 'metric'
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { tdee: number; bmr: number };
    expect(body.tdee).toBeGreaterThan(1500);
    expect(body.bmr).toBeGreaterThan(1200);
  });

  test('POST /v1/user-profiles/ - saves onboarding profile', async () => {
    const res = await api.post('/v1/user-profiles/', {
      birth_year: 1994,
      birth_month: 6,
      birth_day: 15,
      gender: 'male',
      height: 175,
      weight: 70,
      job_type: 'desk',
      training_days_per_week: 3,
      training_minutes_per_session: 60,
      goal: 'recomp'
    });

    // Fail explicitly - if cache has stale data, that's a bug to fix, not mask
    expect(res.status, `Expected 200 but got ${res.status}: ${res.responseBody}`).toBe(200);
    const body = await res.json();
    expect(body).toBe(true);
  });

  test('PUT /v1/users/firebase/{uid}/onboarding/complete - marks onboarding complete', async () => {
    const res = await api.put(`/v1/users/firebase/${env.e2eUid}/onboarding/complete`, {});

    expect(res.status).toBe(200);
    const body = await res.json() as { onboarding_completed: boolean };
    expect(body.onboarding_completed).toBe(true);
  });
});
