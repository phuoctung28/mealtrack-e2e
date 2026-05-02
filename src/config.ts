const STAGING_ALLOWLIST = new Set<string>([
  'https://mealtrack-backend-main.onrender.com',
  'http://localhost:8000'
]);

export type Env = {
  baseUrl: string;
  firebaseWebApiKey: string;
  firebaseServiceAccountJson: string;
  e2eUid: string;
  e2eConfirmStaging: boolean;
  databaseUrl: string;
  revenuecatWebhookSecret: string;
};

export function readEnv(): Env {
  const baseUrlRaw = (process.env.E2E_BASE_URL ?? '').trim();
  if (!baseUrlRaw) throw new Error('Missing E2E_BASE_URL');

  const baseUrl = baseUrlRaw.replace(/\/+$/, '');
  if (!STAGING_ALLOWLIST.has(baseUrl)) {
    throw new Error(
      `E2E_BASE_URL is not allowlisted. Got: ${baseUrl}. Allowed: ${Array.from(STAGING_ALLOWLIST).join(', ')}`
    );
  }

  const firebaseWebApiKey = (process.env.FIREBASE_WEB_API_KEY ?? '').trim();
  if (!firebaseWebApiKey) throw new Error('Missing FIREBASE_WEB_API_KEY');

  let firebaseServiceAccountJson = (process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? '').trim();
  if (!firebaseServiceAccountJson) throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_JSON');

  // Auto-decode base64 if not raw JSON (handles Doppler escaping issues)
  if (!firebaseServiceAccountJson.startsWith('{')) {
    firebaseServiceAccountJson = Buffer.from(firebaseServiceAccountJson, 'base64').toString('utf-8');
  }

  const e2eUid = (process.env.E2E_UID ?? 'e2e-bot').trim();
  if (!e2eUid) throw new Error('Missing/empty E2E_UID');

  const e2eConfirmStaging = (process.env.E2E_CONFIRM_STAGING ?? '') === '1';
  if (process.env.CI && !e2eConfirmStaging) {
    throw new Error('Refusing to run in CI without E2E_CONFIRM_STAGING=1');
  }

  const databaseUrl = (process.env.DATABASE_URL ?? '').trim();
  if (!databaseUrl) throw new Error('Missing DATABASE_URL');

  // Optional - webhook tests will skip if not configured
  const revenuecatWebhookSecret = (process.env.REVENUECAT_WEBHOOK_SECRET ?? '').trim();

  return {
    baseUrl,
    firebaseWebApiKey,
    firebaseServiceAccountJson,
    e2eUid,
    e2eConfirmStaging,
    databaseUrl,
    revenuecatWebhookSecret
  };
}

