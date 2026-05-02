# Mealtrack Staging E2E (API) Smoke Tests

This repository runs **staging-only** end-to-end **API smoke tests** against:

- `https://mealtrack-backend-main.onrender.com`

Authentication is done with **Firebase Custom Token → ID token** (no password / no Google OAuth UI flow required).

## Guardrails

- Tests **refuse to run** unless `E2E_BASE_URL` is allowlisted.
- In CI, tests require `E2E_CONFIRM_STAGING=1`.
- Never commit secrets to git.

## Setup

```bash
npm ci
```

## Required environment variables

- `E2E_BASE_URL` (must be `https://mealtrack-backend-main.onrender.com`)
- `FIREBASE_WEB_API_KEY` (staging Firebase project)
- `FIREBASE_SERVICE_ACCOUNT_JSON` (staging service account JSON, as a single JSON string)
- `DATABASE_URL` (staging database connection string, e.g. `postgresql://user:pass@host:5432/dbname`)
- `E2E_UID` (optional; default `e2e-bot`)
- `REVENUECAT_WEBHOOK_SECRET` (optional; webhook tests skip if not set)

## Run locally

```bash
export E2E_BASE_URL="https://mealtrack-backend-main.onrender.com"
export FIREBASE_WEB_API_KEY="..."
export FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
export E2E_UID="e2e-bot"

npm test
```

## CI

The GitHub Actions workflow runs only via:

- manual dispatch
- nightly schedule

It requires repo secrets:

- `E2E_BASE_URL`
- `FIREBASE_WEB_API_KEY`
- `FIREBASE_SERVICE_ACCOUNT_JSON`
- `DATABASE_URL`

And sets `E2E_CONFIRM_STAGING=1` inside the workflow.

