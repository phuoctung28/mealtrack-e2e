import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { readEnv } from '../../src/config.js';
import { getFirebaseIdToken } from '../../src/auth/firebase.js';
import { createApiClient, ApiClient } from '../../src/http/client.js';

test.describe('Meal Editing Flow @tier2', () => {
  let api: ApiClient;
  let testMealId: string;
  const e2eRunId = crypto.randomUUID();

  test.beforeAll(async () => {
    const env = readEnv();
    const idToken = await getFirebaseIdToken({
      firebaseServiceAccountJson: env.firebaseServiceAccountJson,
      firebaseWebApiKey: env.firebaseWebApiKey,
      uid: env.e2eUid
    });
    api = await createApiClient({ baseUrl: env.baseUrl, idToken, e2eRunId });

    // Create a meal to edit
    const today = new Date().toISOString().split('T')[0];
    const res = await api.post('/v1/meals/manual', {
      target_date: today,
      items: [{
        name: 'Test Meal for Editing',
        quantity: 1,
        unit: 'serving',
        custom_nutrition: { calories: 500, protein_g: 30, carbs_g: 40, fat_g: 20 }
      }]
    });
    expect(res.status).toBe(201);
    const body = await res.json() as { id: string };
    testMealId = body.id;
  });

  test.afterAll(async () => {
    if (testMealId && api) {
      await api.delete(`/v1/meals/${testMealId}`);
    }
  });

  test('PUT /v1/meals/{id}/ingredients - edits meal ingredients', async () => {
    test.skip(!testMealId, 'No test meal created');

    const res = await api.put(`/v1/meals/${testMealId}/ingredients`, {
      changes: [{
        action: 'add',
        item: {
          name: 'Added Item',
          quantity: 1,
          unit: 'piece',
          custom_nutrition: { calories: 100, protein_g: 5, carbs_g: 10, fat_g: 5 }
        }
      }]
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { id: string; food_items: unknown[] };
    expect(body.food_items.length).toBeGreaterThan(1);
  });

  test('DELETE /v1/meals/{id} - deletes meal (soft delete)', async () => {
    test.skip(!testMealId, 'No test meal created');

    const res = await api.delete(`/v1/meals/${testMealId}`);

    expect(res.status).toBe(200);
  });
});
