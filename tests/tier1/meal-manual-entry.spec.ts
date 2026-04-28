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

    if (res.status !== 200) {
      console.log('Parse text response:', res.status, await res.text());
    }
    expect(res.status).toBe(200);
    const body = await res.json() as {
      items: Array<{ name: string; calories: number }>;
      total_calories: number;
      total_protein: number;
    };
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.total_calories).toBeGreaterThan(0);
  });

  test('GET /v1/foods/search - searches foods by name', async () => {
    const res = await api.get('/v1/foods/search?q=chicken');

    if (res.status !== 200) {
      console.log('Foods search response:', res.status, await res.text());
    }
    expect(res.status).toBe(200);
    const body = await res.json() as { results: Array<{ name: string }>; total: number; query: string };
    // Verify response structure (results may be empty if external service is unavailable)
    expect(body).toHaveProperty('results');
    expect(body).toHaveProperty('total');
    expect(body.query).toBe('chicken');
  });

  test('POST /v1/meals/manual - creates manual meal from foods', async () => {
    const today = new Date().toISOString().split('T')[0];

    const res = await api.post('/v1/meals/manual', {
      dish_name: 'E2E Test Scrambled Eggs',
      target_date: today,
      meal_type: 'breakfast',
      source: 'manual',
      items: [
        {
          name: 'Scrambled Eggs',
          quantity: 150,
          unit: 'g',
          custom_nutrition: {
            protein_per_100g: 13,
            carbs_per_100g: 1,
            fat_per_100g: 11
          }
        }
      ]
    });

    if (res.status !== 200 && res.status !== 201) {
      console.log('Manual meal response:', res.status, await res.text());
    }
    expect([200, 201]).toContain(res.status);
    const body = await res.json() as { meal_id: string; status: string; message: string };
    expect(body.meal_id).toBeTruthy();
    createdMealId = body.meal_id;
  });
});
