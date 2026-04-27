import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { readEnv } from '../../src/config.js';
import { request } from '@playwright/test';

test.describe('RevenueCat Webhooks @tier1', () => {
  let env: ReturnType<typeof readEnv>;

  test.beforeAll(() => {
    env = readEnv();
  });

  test('POST /v1/webhooks/revenuecat - handles INITIAL_PURCHASE', async () => {
    test.skip(!env.revenuecatWebhookSecret, 'REVENUECAT_WEBHOOK_SECRET not configured');

    const ctx = await request.newContext({ baseURL: env.baseUrl });

    const payload = {
      api_version: '1.0',
      event: {
        type: 'INITIAL_PURCHASE',
        app_user_id: env.e2eUid,
        product_id: 'premium_monthly',
        purchased_at_ms: Date.now(),
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000
      }
    };

    // Create HMAC signature
    const hmac = crypto.createHmac('sha256', env.revenuecatWebhookSecret);
    hmac.update(JSON.stringify(payload));
    const signature = hmac.digest('hex');

    const res = await ctx.post('/v1/webhooks/revenuecat', {
      data: payload,
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${signature}`
      }
    });

    // 200 = processed, 400 = validation error (user may not exist)
    expect([200, 400]).toContain(res.status());
  });

  test('POST /v1/webhooks/revenuecat - handles RENEWAL', async () => {
    test.skip(!env.revenuecatWebhookSecret, 'REVENUECAT_WEBHOOK_SECRET not configured');

    const ctx = await request.newContext({ baseURL: env.baseUrl });

    const payload = {
      api_version: '1.0',
      event: {
        type: 'RENEWAL',
        app_user_id: env.e2eUid,
        product_id: 'premium_monthly',
        purchased_at_ms: Date.now(),
        expiration_at_ms: Date.now() + 30 * 24 * 60 * 60 * 1000
      }
    };

    const hmac = crypto.createHmac('sha256', env.revenuecatWebhookSecret);
    hmac.update(JSON.stringify(payload));
    const signature = hmac.digest('hex');

    const res = await ctx.post('/v1/webhooks/revenuecat', {
      data: payload,
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${signature}`
      }
    });

    expect([200, 400]).toContain(res.status());
  });
});
