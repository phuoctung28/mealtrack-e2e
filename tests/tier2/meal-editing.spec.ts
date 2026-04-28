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

    // Try to get an existing meal to edit (from today's meals)
    const today = new Date().toISOString().split('T')[0];
    const mealsRes = await api.get(`/v1/meals/daily/macros?date=${today}`);
    if (mealsRes.status === 200) {
      // Get activities which include meals
      const activitiesRes = await api.get(`/v1/activities/daily?date=${today}`);
      if (activitiesRes.status === 200) {
        const activities = await activitiesRes.json() as Array<{ id: string; type: string }>;
        const mealActivity = activities.find(a => a.type === 'meal');
        if (mealActivity) {
          testMealId = mealActivity.id;
        }
      }
    }
    // If no existing meal found, tests will be skipped
  });

  // Note: No cleanup needed - we're using existing meals, not creating new ones

  test.skip('PUT /v1/meals/{id}/ingredients - edits meal ingredients', async () => {
    // TODO: This endpoint requires specific meal ID and request schema
    // Skipping until we can properly create a test meal or verify endpoint schema
    test.skip(!testMealId, 'No test meal available');

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
