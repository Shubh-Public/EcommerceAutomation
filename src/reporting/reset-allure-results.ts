import { rmSync } from 'node:fs';

/**
 * Runs before the Allure reporter starts writing. Each Playwright invocation
 * then owns `allure-results`, so the report matches that command instead of
 * merging earlier runs.
 */
export default function resetAllureResults(): void {
  rmSync('allure-results', { recursive: true, force: true });
}
