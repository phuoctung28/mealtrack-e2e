import 'dotenv/config';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,  // Tests must run sequentially within each file
  workers: 1,  // Force single worker to prevent parallel test file execution
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html']],
  use: {
    trace: 'retain-on-failure'
  },
  projects: [
    // Smoke — a lightweight subset used as a gate for all higher tiers
    {
      name: 'smoke',
      testMatch: /smoke\..+\.spec\.ts$/
    },
    // Tier 1 — fast, stateless checks (auth, health, basic CRUD)
    {
      name: 'tier1',
      testMatch: /tests\/tier1\/.+\.spec\.ts$/,
      dependencies: ['smoke']
    },
    // Tier 2 — stateful flows that depend on tier1 passing first
    {
      name: 'tier2',
      testMatch: /tests\/tier2\/.+\.spec\.ts$/,
      dependencies: ['tier1']
    },
    // Tier 3 — complex / long-running scenarios (AI, webhooks, etc.)
    {
      name: 'tier3',
      testMatch: /tests\/tier3\/.+\.spec\.ts$/,
      dependencies: ['tier2']
    }
  ]
});
