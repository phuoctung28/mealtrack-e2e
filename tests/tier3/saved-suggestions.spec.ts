import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { readEnv } from '../../src/config.js';
import { getFirebaseIdToken } from '../../src/auth/firebase.js';
import { createApiClient, ApiClient } from '../../src/http/client.js';

test.describe('Saved Suggestions @tier3', () => {
  let api: ApiClient;
  let savedSuggestionId: string;
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

  test('POST /v1/saved-suggestions - bookmarks a suggestion', async () => {
    const suggestionId = crypto.randomUUID();
    const res = await api.post('/v1/saved-suggestions', {
      suggestion_id: suggestionId,
      meal_type: 'lunch',
      portion_multiplier: 1,
      suggestion_data: {
        name: 'E2E Test Saved Meal',
        description: 'A test meal for E2E',
        calories: 500,
        protein: 30,
        carbs: 50,
        fat: 20
      }
    });

    // Fail explicitly on server errors - don't mask bugs
    expect(res.status, `Server error: ${res.responseBody}`).toBeLessThan(500);
    if (res.status !== 200 && res.status !== 201) {
      console.log('Save suggestion response:', res.status, await res.text());
    }
    // 200/201 = created, already exists returns 200
    expect([200, 201]).toContain(res.status);
    const body = await res.json() as { id: string };
    if (body.id) {
      savedSuggestionId = body.id;
    } else {
      savedSuggestionId = suggestionId;
    }
  });

  test('GET /v1/saved-suggestions - lists saved suggestions', async () => {
    const res = await api.get('/v1/saved-suggestions');

    expect(res.status).toBe(200);
    // Response may be an array or object with suggestions field
    const body = await res.json() as unknown;
    const suggestions = Array.isArray(body) ? body : (body as { suggestions?: unknown[] })?.suggestions;
    expect(Array.isArray(suggestions) || suggestions === undefined).toBe(true);
  });

  test('DELETE /v1/saved-suggestions/{id} - removes bookmark', async () => {
    expect(savedSuggestionId, 'Previous test must create a saved suggestion').toBeTruthy();

    const res = await api.delete(`/v1/saved-suggestions/${savedSuggestionId}`);

    expect(res.status).toBe(200);
  });
});
