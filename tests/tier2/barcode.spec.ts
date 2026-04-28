import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { readEnv } from '../../src/config.js';
import { getFirebaseIdToken } from '../../src/auth/firebase.js';
import { createApiClient, ApiClient } from '../../src/http/client.js';

test.describe('Barcode Lookup Flow @tier2', () => {
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

  test('GET /v1/foods/barcode/{barcode} - looks up product by barcode', async () => {
    // Use a known barcode (Coca-Cola)
    const res = await api.get('/v1/foods/barcode/5449000000996');

    // 200 = found, 404 = not in database
    expect([200, 404]).toContain(res.status);

    if (res.status === 200) {
      const body = await res.json() as { name: string; nutrition: unknown };
      expect(body.name).toBeTruthy();
    }
  });

  test('GET /v1/foods/{fdc_id}/details - gets food details', async () => {
    // Use a well-known USDA FDC ID (apple, raw)
    const fdcId = '1750339';  // Apple, raw, with skin
    const res = await api.get(`/v1/foods/${fdcId}/details`);

    // 200 = found, 404 = not in USDA database
    if (res.status !== 200 && res.status !== 404) {
      console.log('Food details response:', res.status, await res.text());
    }
    expect([200, 404]).toContain(res.status);

    if (res.status === 200) {
      const body = await res.json() as { fdc_id: number; name: string; calories: number; macros: unknown };
      expect(body.fdc_id).toBeTruthy();
      expect(body.name).toBeTruthy();
    }
  });
});
