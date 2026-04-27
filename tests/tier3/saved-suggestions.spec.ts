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
    const res = await api.post('/v1/saved-suggestions', {
      suggestion: {
        id: crypto.randomUUID(),
        name: 'E2E Test Saved Meal',
        description: 'A test meal for E2E',
        nutrition: { calories: 500, protein_g: 30, carbs_g: 50, fat_g: 20 }
      }
    });

    expect(res.status).toBe(201);
    const body = await res.json() as { id: string };
    expect(body.id).toBeTruthy();
    savedSuggestionId = body.id;
  });

  test('GET /v1/saved-suggestions - lists saved suggestions', async () => {
    const res = await api.get('/v1/saved-suggestions');

    expect(res.status).toBe(200);
    const body = await res.json() as { suggestions: unknown[] };
    expect(Array.isArray(body.suggestions)).toBe(true);
  });

  test('DELETE /v1/saved-suggestions/{id} - removes bookmark', async () => {
    test.skip(!savedSuggestionId, 'No saved suggestion to delete');

    const res = await api.delete(`/v1/saved-suggestions/${savedSuggestionId}`);

    expect(res.status).toBe(200);
  });
});
