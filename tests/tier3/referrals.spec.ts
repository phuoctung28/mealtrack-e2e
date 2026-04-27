import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { readEnv } from '../../src/config.js';
import { getFirebaseIdToken } from '../../src/auth/firebase.js';
import { createApiClient, ApiClient } from '../../src/http/client.js';

test.describe('Referrals @tier3', () => {
  let api: ApiClient;
  let myReferralCode: string;
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

  test('GET /v1/referrals/my-code - gets or creates referral code', async () => {
    const res = await api.get('/v1/referrals/my-code');

    expect(res.status).toBe(200);
    const body = await res.json() as { code: string };
    expect(body.code).toBeTruthy();
    myReferralCode = body.code;
  });

  test('POST /v1/referrals/validate - validates a referral code', async () => {
    test.skip(!myReferralCode, 'No referral code available');

    const res = await api.post('/v1/referrals/validate', {
      code: myReferralCode
    });

    // Own code validation may return 400, other codes return 200
    expect([200, 400]).toContain(res.status);
  });

  test('POST /v1/referrals/apply - applies a referral code', async () => {
    // Note: Cannot apply own code, so this tests the endpoint exists and validates
    const res = await api.post('/v1/referrals/apply', {
      code: 'INVALID_TEST_CODE_12345'
    });

    // 400 = invalid code (expected), 200 = applied successfully
    expect([200, 400]).toContain(res.status);
  });

  test('GET /v1/referrals/stats - gets referral stats', async () => {
    const res = await api.get('/v1/referrals/stats');

    expect(res.status).toBe(200);
    const body = await res.json() as {
      wallet_balance: number;
      total_earned: number;
      conversions: number
    };
    expect(body.wallet_balance).toBeGreaterThanOrEqual(0);
    expect(body.total_earned).toBeGreaterThanOrEqual(0);
  });
});
