import { spawnSync } from 'node:child_process';
import path from 'node:path';
import type { Reporter } from '@playwright/test/reporter';

/**
 * Registered after `allure-playwright`, so `onEnd` runs once that reporter has
 * flushed `allure-results`. Rebuilds `allure-report` for `npm run allure:open`.
 */
export default class RefreshAllureReport implements Reporter {
  onEnd(): void {
    const allure = path.resolve('node_modules/.bin/allure');
    const generated = spawnSync(allure, ['generate', 'allure-results', '--clean'], {
      stdio: 'inherit',
    });
    if (generated.status !== 0) {
      throw new Error(
        `Could not refresh allure-report (allure generate exited ${generated.status ?? 'without a status'}).`,
      );
    }
  }
}
