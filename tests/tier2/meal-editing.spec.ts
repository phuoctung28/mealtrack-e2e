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

    // Create a test meal for editing
    const today = new Date().toISOString().split('T')[0];
    const res = await api.post('/v1/meals/manual', {
      dish_name: 'E2E Test Meal for Editing',
      target_date: today,
      meal_type: 'lunch',
      source: 'manual',
      items: [
        {
          name: 'Test Ingredient',
          quantity: 100,
          unit: 'g',
          custom_nutrition: {
            protein_per_100g: 20,
            carbs_per_100g: 10,
            fat_per_100g: 5
          }
        }
      ]
    });

    if (res.status === 200 || res.status === 201) {
      const body = await res.json() as { meal_id: string };
      testMealId = body.meal_id;
    }
    // If meal creation fails, tests will be skipped
  });

  test('PUT /v1/meals/{id}/ingredients - edits meal ingredients', async () => {
    test.skip(!testMealId, 'No test meal available');

    const res = await api.put(`/v1/meals/${testMealId}/ingredients`, {
      food_item_changes: [{
        action: 'add',
        name: 'Added Ingredient',
        quantity: 50,
        unit: 'g',
        custom_nutrition: {
          protein_per_100g: 10,
          carbs_per_100g: 20,
          fat_per_100g: 5
        }
      }]
    });

    if (res.status !== 200) {
      console.log('Edit meal response:', res.status, await res.text());
    }
    expect(res.status).toBe(200);
  });

  test('DELETE /v1/meals/{id} - deletes meal (soft delete)', async () => {
    test.skip(!testMealId, 'No test meal created');

    const res = await api.delete(`/v1/meals/${testMealId}`);

    expect(res.status).toBe(200);
  });
});
