import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  checkEnvHygiene,
  checkHardcodedSecrets,
  checkPackageScripts,
  checkPageFixtureRegistration,
  checkPageObject,
  checkSpecFile,
  type Violation,
} from './framework-rules.ts';

const rules = (violations: readonly Violation[]): string[] => violations.map((v) => v.rule);

const COMPLIANT_UI_SPEC = `
import { expect, test } from '../../src/fixtures/test.ts';
import type { Page } from '@playwright/test';
import { knownProducts } from '../../src/data/catalogue.ts';

// Never call page.locator('#x') or page.waitForTimeout(1000) in a spec.
test('example', async ({ productsPage, page }) => {
  const note = 'use page.getByRole in page objects, not here';
  await productsPage.goto();
  await expect(productsPage.productNames).toContainText([knownProducts.blueTop.name]);
  await expect(page).toHaveURL(/products/);
});
`;

describe('checkSpecFile', () => {
  it('accepts a compliant UI spec, ignoring comments, strings and type-only imports', () => {
    assert.deepEqual(
      checkSpecFile({ path: 'tests/ui/example.spec.ts', text: COMPLIANT_UI_SPEC }),
      [],
    );
  });

  it('rejects specs that bypass fixtures or build locators', () => {
    const text = `
      import { test, expect } from '@playwright/test';
      import { ProductsPage } from '../../src/pages/products-page.ts';
      test('bad', async ({ page }) => {
        const products = new ProductsPage(page);
        await page.getByRole('button', { name: 'Go' }).click();
        await expect(page.locator('#x')).toBeVisible();
      });
    `;
    assert.deepEqual(rules(checkSpecFile({ path: 'tests/ui/bad.spec.ts', text })), [
      'spec-uses-fixtures',
      'spec-no-manual-construction',
      'spec-uses-fixtures',
      'spec-no-raw-locators',
      'spec-no-raw-locators',
    ]);
  });

  it('rejects reporter-specific imports in specs', () => {
    const text = `
      import { expect, test } from '../../src/fixtures/test.ts';
      import * as allure from 'allure-js-commons';
      import { reportMetadata } from '../../src/reporting/report-metadata.ts';
    `;
    assert.deepEqual(rules(checkSpecFile({ path: 'tests/ui/x.spec.ts', text })), [
      'spec-reporter-agnostic',
    ]);
  });

  it('rejects browser and raw request fixtures in API specs', () => {
    const text = `
      import { expect, test } from '../../src/fixtures/test.ts';
      test('bad', async ({ page, request: http }) => {
        expect(await http.get('/api/productsList')).toBeTruthy();
      });
    `;
    assert.deepEqual(rules(checkSpecFile({ path: 'tests/api/bad.api.spec.ts', text })), [
      'spec-uses-api-client',
      'api-spec-no-browser',
    ]);
  });

  it('enforces API spec naming and location', () => {
    const text = `import { test } from '../src/fixtures/test.ts';`;
    assert.deepEqual(
      rules(
        checkSpecFile({ path: 'tests/api/products.spec.ts', text: text.replace('../', '../../') }),
      ),
      ['spec-naming'],
    );
    assert.deepEqual(rules(checkSpecFile({ path: 'tests/other.spec.ts', text })), [
      'spec-location',
    ]);
  });
});

describe('checkHardcodedSecrets', () => {
  it('ignores generated values, empty strings, comments and unrelated names', () => {
    const text = `
      // password: 'hunter2' is an example in a comment
      const password = \`Pw-\${randomUUID()}\`;
      const user = { email: 'qa@example.com', password: buildPassword() };
      const tokenCount = 3;
      let apiKey = '';
      const label = 'password';
    `;
    assert.deepEqual(checkHardcodedSecrets({ path: 'src/x.ts', text }), []);
  });

  it('flags string literals assigned to secret-looking names', () => {
    const text = `
      const password = 'hunter2';
      const creds = { apiKey: \`abc123\` };
      config.authToken = "xyz";
      class Client { private readonly clientSecret = 's3cr3t'; }
      function login(pass: string, password = 'default') {}
    `;
    assert.equal(checkHardcodedSecrets({ path: 'src/x.ts', text }).length, 5);
  });
});

describe('page object rules', () => {
  it('forbids expect in page objects but allows type-only Playwright imports', () => {
    const ok = `import type { Locator, Page } from '@playwright/test';`;
    const bad = `import { expect, type Page } from '@playwright/test';`;
    assert.deepEqual(checkPageObject({ path: 'src/pages/a.ts', text: ok }), []);
    assert.deepEqual(rules(checkPageObject({ path: 'src/pages/a.ts', text: bad })), [
      'page-object-no-assertions',
    ]);
  });

  it('requires every non-component page to be imported by the fixtures', () => {
    const fixtures = {
      path: 'src/fixtures/test.ts',
      text: `import { CartPage } from '../pages/cart-page.ts';`,
    };
    const violations = checkPageFixtureRegistration(
      ['src/pages/cart-page.ts', 'src/pages/new-page.ts', 'src/pages/components/site-header.ts'],
      fixtures,
    );
    assert.deepEqual(
      violations.map((v) => v.file),
      ['src/pages/new-page.ts'],
    );
  });
});

describe('repository rules', () => {
  it('reports missing and incomplete npm scripts', () => {
    const pkg = JSON.stringify({
      scripts: { test: 'playwright test', 'test:ui': 'playwright test' },
    });
    const messages = checkPackageScripts(pkg).map((v) => v.message);
    assert.ok(messages.includes('npm script "test:ui" must contain: --project=ui.'));
    assert.ok(messages.includes('npm script "lint" is missing.'));
    assert.ok(!messages.some((m) => m.includes('"test"')));
  });

  it('keeps .env.example in sync with the env module and free of secret values', () => {
    const envModule = { path: 'src/config/env.ts', text: `read('BASE_URL'); read('RETRIES');` };
    const example = 'BASE_URL=https://x.test\nAPI_TOKEN=abc\n';
    const violations = checkEnvHygiene('node_modules/\n', example, envModule);
    assert.deepEqual(rules(violations).sort(), [
      'env-documented',
      'env-documented',
      'env-hygiene',
      'env-hygiene',
    ]);
  });
});
