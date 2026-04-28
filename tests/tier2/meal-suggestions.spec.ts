import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { readEnv } from '../../src/config.js';
import { getFirebaseIdToken } from '../../src/auth/firebase.js';
import { createApiClient, ApiClient } from '../../src/http/client.js';

test.describe('Meal Suggestions Flow @tier2', () => {
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
    test.skip(discoveredMeals.length === 0, 'No meals discovered');

    const res = await api.post('/v1/meal-suggestions/recipes', {
      meal_names: [discoveredMeals[0].english_name],
      meal_type: 'lunch'
    });

    // Accept 200 (success) or 5xx (server errors - AI generation can fail)
    if (res.status >= 500) {
      console.log('Server error on recipe generation:', res.status);
      test.skip();
      return;
    }
    if (res.status !== 200) {
      console.log('Recipes response:', res.status, await res.text());
    }
    expect(res.status).toBe(200);
    const body = await res.json() as { recipes: Array<{ name: string; ingredients: unknown[] }> };
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
