# mealtrack-e2e codebase structure

- `src/config.ts`: env var parsing + staging allowlist + CI guardrail
- `src/auth/firebase.ts`: Firebase Admin init + custom token → idToken exchange
- `src/http/client.ts`: minimal API client built on Playwright request context
- `tests/e2e/*.spec.ts`: Playwright tests (tagged with `@e2e` when desired)
- `playwright.config.ts`: test runner config + reporters
- `.github/workflows/e2e-staging.yml`: nightly + manual CI workflow
