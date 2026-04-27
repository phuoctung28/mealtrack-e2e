import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { readEnv } from '../../src/config.js';
import { getFirebaseIdToken } from '../../src/auth/firebase.js';
import { createApiClient, ApiClient } from '../../src/http/client.js';
import { cleanupTestData } from '../../src/db/cleanup.js';
import { seedTestUser } from '../../src/db/seed.js';

test.describe('User Onboarding Flow @tier1', () => {
  let api: ApiClient;
  let env: ReturnType<typeof readEnv>;
  const e2eRunId = crypto.randomUUID();

  test.beforeAll(async () => {
    env = readEnv();

    // Cleanup and seed
    await cleanupTestData(env.databaseUrl);
    await seedTestUser({ databaseUrl: env.databaseUrl, uid: env.e2eUid });

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
      email: 'e2e-test@e2e-test.local',
      provider: 'custom'
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { user_id: string; created: boolean };
    expect(body.user_id).toBeTruthy();
  });

  test('GET /v1/users/firebase/{uid}/status - checks onboarding status', async () => {
    const res = await api.get(`/v1/users/firebase/${env.e2eUid}/status`);

    expect(res.status).toBe(200);
    const body = await res.json() as { onboarding_completed: boolean };
    expect(body.onboarding_completed).toBe(false);
  });

  test('POST /v1/tdee/preview - calculates TDEE preview', async () => {
    const res = await api.post('/v1/tdee/preview', {
      weight_kg: 70,
      height_cm: 175,
      age: 30,
      gender: 'male',
      activity_level: 'moderate',
      fitness_goal: 'maintain'
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { tdee: number; bmr: number };
    expect(body.tdee).toBeGreaterThan(1500);
    expect(body.bmr).toBeGreaterThan(1200);
  });

  test('POST /v1/user-profiles/ - saves onboarding profile', async () => {
    const res = await api.post('/v1/user-profiles/', {
      weight_kg: 70,
      height_cm: 175,
      age: 30,
      gender: 'male',
      activity_level: 'moderate',
      fitness_goal: 'maintain',
      dietary_preferences: ['none']
    });

    expect(res.status).toBe(201);
    const body = await res.json() as { id: string; tdee: number };
    expect(body.id).toBeTruthy();
    expect(body.tdee).toBeGreaterThan(0);
  });

  test('PUT /v1/users/firebase/{uid}/onboarding/complete - marks onboarding complete', async () => {
    const res = await api.put(`/v1/users/firebase/${env.e2eUid}/onboarding/complete`, {});

    expect(res.status).toBe(200);
    const body = await res.json() as { onboarding_completed: boolean };
    expect(body.onboarding_completed).toBe(true);
  });
});
