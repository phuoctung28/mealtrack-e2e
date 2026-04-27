# mealtrack-e2e purpose

This repo contains staging-only end-to-end API smoke tests for the Mealtrack backend.

- Runs against an allowlisted staging base URL (currently `https://mealtrack-backend-main.onrender.com`).
- Auth uses Firebase Admin to mint a Custom Token, then exchanges it for an ID token via Google Identity Toolkit.
- Tests are written with Playwright test runner (API-level via `request.newContext`).
