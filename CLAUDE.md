# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Playwright-based E2E API smoke tests for the Mealtrack backend. Tests run against staging only (`https://mealtrack-backend-main.onrender.com` or `localhost:8000`).

## Commands

```bash
npm test                    # Run all tests (tiers execute in order)
npm run test:tier1          # Run tier1 tests only
npm run test:tier2          # Run tier2 tests only
npm run test:tier3          # Run tier3 tests only
npx playwright test tests/tier1/meal-image-analysis.spec.ts  # Run single test file
npm run db:cleanup          # Clean test data from staging DB
npm run db:seed             # Seed test data
```

## Required Environment Variables

```bash
E2E_BASE_URL                    # Must be allowlisted in src/config.ts
FIREBASE_WEB_API_KEY            # Staging Firebase project
FIREBASE_SERVICE_ACCOUNT_JSON   # Service account JSON as single string
DATABASE_URL                    # Staging PostgreSQL connection string
E2E_UID                         # Optional, defaults to "e2e-bot"
REVENUECAT_WEBHOOK_SECRET       # Optional, webhook tests skip if not set
E2E_CONFIRM_STAGING             # Required in CI (set to "1")
```

## Architecture

### Test Tiers (playwright.config.ts)

Tests run sequentially with tier dependencies:
- **smoke** - Gate for all higher tiers
- **tier1** - Fast, stateless checks (auth, health, basic CRUD). Depends on smoke.
- **tier2** - Stateful flows. Depends on tier1.
- **tier3** - Complex/long-running scenarios (AI, webhooks). Depends on tier2.

### Source Structure

- `src/config.ts` - Environment validation with staging URL allowlist
- `src/auth/firebase.ts` - Firebase custom token → ID token exchange
- `src/http/client.ts` - Playwright-based API client with request/response logging
- `src/db/` - Direct database utilities for cleanup and seeding

### Test Patterns

Tests use `test.describe.configure({ mode: 'serial' })` - tests within a file run sequentially. Each test file gets a unique `e2eRunId` (UUID) passed via `x-e2e-run-id` header for tracing.

Authentication flow: Firebase service account creates custom token → exchanged for ID token → passed as Bearer token.

## Safety Guardrails

- `src/config.ts` enforces URL allowlist - tests refuse to run against non-staging URLs
- CI requires `E2E_CONFIRM_STAGING=1` to prevent accidental production runs
- Tests are idempotent - user sync handles both create and update
