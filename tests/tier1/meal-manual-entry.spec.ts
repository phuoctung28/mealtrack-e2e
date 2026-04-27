import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { readEnv } from '../../src/config.js';
import { getFirebaseIdToken } from '../../src/auth/firebase.js';
import { createApiClient, ApiClient } from '../../src/http/client.js';

test.describe('Manual Meal Entry Flow @tier1', () => {
  let api: ApiClient;
  let createdMealId: string;
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

  test('POST /v1/meals/parse-text - parses natural language meal description', async () => {
    const res = await api.post('/v1/meals/parse-text', {
      text: '2 scrambled eggs and a slice of toast'
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { items: unknown[]; total_nutrition: { calories: number } };
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.total_nutrition.calories).toBeGreaterThan(0);
  });

  test('GET /v1/foods/search - searches foods by name', async () => {
    const res = await api.get('/v1/foods/search?q=chicken%20breast');

    expect(res.status).toBe(200);
    const body = await res.json() as { foods: Array<{ fdc_id: string; name: string }> };
    expect(body.foods.length).toBeGreaterThan(0);
  });

  test('POST /v1/meals/manual - creates manual meal from foods', async () => {
    const today = new Date().toISOString().split('T')[0];

    const res = await api.post('/v1/meals/manual', {
      target_date: today,
      items: [
        {
          name: 'Scrambled Eggs',
          quantity: 2,
          unit: 'large',
          custom_nutrition: {
            calories: 180,
            protein_g: 12,
            carbs_g: 2,
            fat_g: 14
          }
        }
      ]
    });

    expect(res.status).toBe(201);
    const body = await res.json() as { id: string; status: string };
    expect(body.id).toBeTruthy();
    createdMealId = body.id;
  });
});
