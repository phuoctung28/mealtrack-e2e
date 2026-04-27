import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { readEnv } from '../../src/config.js';
import { getFirebaseIdToken } from '../../src/auth/firebase.js';
import { createApiClient, ApiClient } from '../../src/http/client.js';

test.describe('Meal Suggestions Flow @tier2', () => {
  let api: ApiClient;
  let discoveredMeals: Array<{ id: string; name: string }> = [];
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

  test('POST /v1/meal-suggestions/discover - discovers meal suggestions', async () => {
    const res = await api.post('/v1/meal-suggestions/discover', {
      meal_type: 'lunch',
      count: 3
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { suggestions: Array<{ id: string; name: string }> };
    expect(body.suggestions.length).toBeGreaterThan(0);
    discoveredMeals = body.suggestions;
  });

  test('POST /v1/meal-suggestions/recipes - generates recipes for selected meals', async () => {
    test.skip(discoveredMeals.length === 0, 'No meals discovered');

    const res = await api.post('/v1/meal-suggestions/recipes', {
      suggestion_ids: [discoveredMeals[0].id]
    });

    expect(res.status).toBe(200);
    const body = await res.json() as { recipes: Array<{ id: string; ingredients: unknown[] }> };
    expect(body.recipes.length).toBeGreaterThan(0);
    expect(body.recipes[0].ingredients).toBeDefined();
  });

  test('GET /v1/meal-suggestions/image - gets food image', async () => {
    const res = await api.get('/v1/meal-suggestions/image?q=grilled%20chicken');

    // 200 = image found, 204 = not found
    expect([200, 204]).toContain(res.status);
  });

  test('POST /v1/meal-suggestions/save - saves suggestion as meal', async () => {
    test.skip(discoveredMeals.length === 0, 'No meals discovered');

    const today = new Date().toISOString().split('T')[0];
    const res = await api.post('/v1/meal-suggestions/save', {
      suggestion_id: discoveredMeals[0].id,
      target_date: today
    });

    expect(res.status).toBe(201);
    const body = await res.json() as { meal_id: string };
    expect(body.meal_id).toBeTruthy();
  });
});
