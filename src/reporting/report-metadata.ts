import type { TestDetailsAnnotation } from '@playwright/test';

export type Severity = 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';

export interface ReportMetadata {
  readonly layer?: 'ui' | 'api';
  readonly epic?: string;
  readonly feature?: string;
  readonly story?: string;
  readonly severity?: Severity;
  readonly owner?: string;
}

/**
 * Report labels expressed as native Playwright annotations, so specs stay
 * reporter-agnostic. allure-playwright maps `allure.label.<name>` annotations
 * to Allure labels (Behaviors tree, severity, owner, layer); the Playwright
 * HTML report shows them as plain annotations.
 *
 * Use on `test.describe(title, { annotation: reportMetadata(...) }, ...)` for
 * shared labels and on individual tests for severity/story.
 */
export function reportMetadata(metadata: ReportMetadata): TestDetailsAnnotation[] {
  return Object.entries(metadata).flatMap(([name, value]) =>
    typeof value === 'string' ? [{ type: `allure.label.${name}`, description: value }] : [],
  );
}
