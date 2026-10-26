import os from 'node:os';
import { defineConfig, devices } from '@playwright/test';
import type AllureReporter from 'allure-playwright';
import { env } from './src/config/env.ts';

// allure-playwright does not export its config interface by name.
type AllurePlaywrightReporterConfig = ConstructorParameters<typeof AllureReporter>[0];

export default defineConfig({
  testDir: './tests',
  globalSetup: './src/reporting/reset-allure-results.ts',
  fullyParallel: true,
  forbidOnly: true,
  retries: env.retries,
  ...(env.workers === undefined ? {} : { workers: env.workers }),
  timeout: env.testTimeoutMs,
  expect: { timeout: env.expectTimeoutMs },
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        // Hide Playwright's internal fixture/hook steps; keep test.step() and API calls.
        detail: false,
        environmentInfo: {
          BASE_URL: env.baseUrl,
          NODE_VERSION: process.version,
          OS: `${os.platform()} ${os.release()}`,
          RETRIES: String(env.retries),
        },
      } satisfies AllurePlaywrightReporterConfig,
    ],
    // After allure-playwright, so the report is rebuilt from this run's results.
    ['./src/reporting/refresh-allure-report.ts'],
  ],
  outputDir: 'test-results',

  use: {
    baseURL: env.baseUrl,
    // The application exposes stable `data-qa` hooks on its forms.
    testIdAttribute: 'data-qa',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: 'ui',
      testDir: './tests/ui',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'api',
      // API specs only use the `request` fixture, so no browser is launched.
      testDir: './tests/api',
    },
  ],
});
