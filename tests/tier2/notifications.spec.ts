import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { readEnv } from '../../src/config.js';
import { getFirebaseIdToken } from '../../src/auth/firebase.js';
import { createApiClient, ApiClient } from '../../src/http/client.js';

test.describe('Notifications Flow @tier2', () => {
  let api: ApiClient;
  const e2eRunId = crypto.randomUUID();
  const testFcmToken = `e2e-test-token-${crypto.randomUUID()}`;

  test.beforeAll(async () => {
    const env = readEnv();
    const idToken = await getFirebaseIdToken({
      firebaseServiceAccountJson: env.firebaseServiceAccountJson,
      firebaseWebApiKey: env.firebaseWebApiKey,
      uid: env.e2eUid
    });
    api = await createApiClient({ baseUrl: env.baseUrl, idToken, e2eRunId });
  });

  test('POST /v1/notifications/tokens - registers FCM token', async () => {
    const res = await api.post('/v1/notifications/tokens', {
      token: testFcmToken,
      device_type: 'ios',
      timezone: 'America/New_York'
    });

    expect(res.status).toBe(201);
  });

  test('PUT /v1/notifications/preferences - updates notification preferences', async () => {
    const res = await api.put('/v1/notifications/preferences', {
      breakfast_reminder: true,
      breakfast_time: '08:00',
      lunch_reminder: true,
      lunch_time: '12:00',
      dinner_reminder: false,
      daily_summary: true
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { breakfast_reminder: boolean };
    expect(body.breakfast_reminder).toBe(true);
  });

  test('DELETE /v1/notifications/tokens - deletes FCM token', async () => {
    const res = await api.delete('/v1/notifications/tokens');

    expect(res.status).toBe(200);
  });
});
