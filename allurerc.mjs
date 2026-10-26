import { defineConfig } from 'allure';

/**
 * Allure Report 3 configuration (`npx allure generate|open|run` read this file).
 * Categories are evaluated in order; a failed test lands in the first match.
 */
export default defineConfig({
  name: 'Automation Exercise E2E',
  output: './allure-report',
  resultsDir: './allure-results',
  categories: [
    {
      name: 'Site or network outage (not a framework defect)',
      matchers: {
        message: /server-side failure|net::ERR_|ECONNRESET|ETIMEDOUT|socket hang up/,
      },
    },
    {
      name: 'API contract violations',
      matchers: { message: /ApiContractError/ },
    },
    {
      name: 'Timeouts and synchronisation',
      matchers: { message: /Timeout \d+ms exceeded|Test timeout of \d+ms exceeded/ },
    },
    {
      name: 'Assertion failures (possible product defects)',
      matchers: { statuses: ['failed'] },
    },
    {
      name: 'Broken tests (framework or test-code errors)',
      matchers: { statuses: ['broken'] },
    },
  ],
});
