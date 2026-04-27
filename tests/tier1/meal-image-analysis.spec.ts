import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { readEnv } from '../../src/config.js';
import { getFirebaseIdToken } from '../../src/auth/firebase.js';
import { createApiClient, ApiClient } from '../../src/http/client.js';

test.describe('Meal Image Analysis Flow @tier1', () => {
  let api: ApiClient;
  let env: ReturnType<typeof readEnv>;
  let createdMealId: string;
  const e2eRunId = crypto.randomUUID();

  test.beforeAll(async () => {
    env = readEnv();
    const idToken = await getFirebaseIdToken({
      firebaseServiceAccountJson: env.firebaseServiceAccountJson,
      firebaseWebApiKey: env.firebaseWebApiKey,
      uid: env.e2eUid
    });
    api = await createApiClient({ baseUrl: env.baseUrl, idToken, e2eRunId });
  });

  test('POST /v1/meals/image/analyze - analyzes meal from image', async () => {
    const imagePath = path.join(process.cwd(), 'tests/fixtures/sample-food.jpg');
    const imageBuffer = fs.readFileSync(imagePath);
    const today = new Date().toISOString().split('T')[0];

    const res = await api.postMultipart(`/v1/meals/image/analyze?target_date=${today}`, {
      file: { name: 'sample-food.jpg', mimeType: 'image/jpeg', buffer: imageBuffer }
    });

    // May return 200 (success), 400 (not food image), or 422 (validation error)
    if (![200, 400].includes(res.status)) {
      console.log('Image analyze response:', res.status, await res.text());
    }
    expect([200, 400]).toContain(res.status);

    if (res.status === 200) {
      const body = await res.json() as { meal_id: string; status: string };
      expect(body.meal_id).toBeTruthy();
      createdMealId = body.meal_id;
    }
  });

  test('GET /v1/meals/{id} - gets meal detail', async () => {
    // Skip if no meal was created
    test.skip(!createdMealId, 'No meal created from previous test');

    const res = await api.get(`/v1/meals/${createdMealId}`);

    expect(res.status).toBe(200);
    const body = await res.json() as {
      meal_id: string;
      status: string;
      food_items: unknown[];
      total_calories: number | null;
    };
    expect(body.meal_id).toBe(createdMealId);
    expect(body.food_items).toBeDefined();
  });
});
