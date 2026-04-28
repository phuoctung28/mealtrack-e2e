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
    // First search for a food to get an FDC ID
    const searchRes = await api.get('/v1/foods/search?q=apple');
    expect(searchRes.status).toBe(200);
    const searchBody = await searchRes.json() as { results: Array<{ fdc_id: string }>; total: number };

    test.skip(!searchBody.results || searchBody.results.length === 0, 'No foods found in search');

    const fdcId = searchBody.results[0].fdc_id;
    const res = await api.get(`/v1/foods/${fdcId}/details`);

    expect(res.status).toBe(200);
    const body = await res.json() as { fdc_id: string; nutrients: unknown };
    expect(body.fdc_id).toBe(fdcId);
  });
});
