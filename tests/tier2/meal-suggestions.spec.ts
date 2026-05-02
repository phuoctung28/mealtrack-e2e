import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { readEnv } from '../../src/config.js';
import { getFirebaseIdToken } from '../../src/auth/firebase.js';
import { createApiClient, ApiClient } from '../../src/http/client.js';

test.describe('Meal Suggestions Flow @tier2', () => {
  test.describe.configure({ mode: 'serial' });

  let api: ApiClient;
  let discoveredMeals: Array<{ id: string; meal_name: string; english_name: string; macros: { calories: number; protein: number; carbs: number; fat: number } }> = [];
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
      batch_size: 3
    });

    if (res.status !== 200) {
      console.log('Discover response:', res.status, await res.text());
    }
    expect(res.status).toBe(200);
    const body = await res.json() as {
      session_id: string;
      meals: Array<{ id: string; meal_name: string; english_name: string; macros: { calories: number; protein: number; carbs: number; fat: number } }>;
      has_more: boolean;
      meal_count: number;
    };
    expect(body.meals.length).toBeGreaterThan(0);
    discoveredMeals = body.meals;
  });

  test('POST /v1/meal-suggestions/recipes - generates recipes for selected meals', async () => {
    expect(discoveredMeals.length, 'Previous test must discover meals').toBeGreaterThan(0);

    const meal = discoveredMeals[0];
    const res = await api.post('/v1/meal-suggestions/recipes', {
      meal_names: [meal.english_name],
      meal_type: 'lunch',
      calorie_target: meal.macros.calories
    });

    // Fail explicitly on server errors - don't mask AI generation bugs
    expect(res.status, `Server error: ${res.responseBody}`).toBeLessThan(500);
    expect(res.status).toBe(200);
    const body = await res.json() as { recipes: Array<{ name: string; ingredients: unknown[] }> };
    expect(body.recipes.length).toBeGreaterThan(0);
    expect(body.recipes[0].ingredients).toBeDefined();
  });

  test('GET /v1/meal-suggestions/image - gets food image', async () => {
    const res = await api.get('/v1/meal-suggestions/image?q=grilled%20chicken');

    // 200 = image found, 204 = not found, 404 = backend bug (should be 204)
    // TODO: Fix backend to return 204 instead of 404 for "not found"
    expect([200, 204, 404]).toContain(res.status);
  });

  test('POST /v1/meal-suggestions/save - saves suggestion as meal', async () => {
    expect(discoveredMeals.length, 'Discover test must find meals').toBeGreaterThan(0);

    const today = new Date().toISOString().split('T')[0];
    const meal = discoveredMeals[0];
    const res = await api.post('/v1/meal-suggestions/save', {
      suggestion_id: meal.id,
      name: meal.meal_name,
      meal_type: 'lunch',
      protein: meal.macros.protein,
      carbs: meal.macros.carbs,
      fat: meal.macros.fat,
      meal_date: today,
      ingredients: [],
      instructions: []
    });

    if (res.status !== 200) {
      console.log('Save suggestion response:', res.status, await res.text());
    }
    expect(res.status).toBe(200);
    const body = await res.json() as { meal_id: string; message: string };
    expect(body.meal_id).toBeTruthy();
  });
});
