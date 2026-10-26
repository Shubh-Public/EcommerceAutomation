# AGENTS.md — rules and guide for this repository

Playwright Test + TypeScript (strict) suite for https://automationexercise.com.
This file is the single entry point: enforceable rules, how the framework works,
and copy-paste recipes for new tests. Enforced by `npm run validate`; a change
is not done until it passes. Architecture trade-offs: `DECISIONS.md`. AI log:
`AI_USAGE.md`.

## Repository map

| Path                                 | Responsibility                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------- |
| `playwright.config.ts`               | Projects `ui` (Chromium, `tests/ui`) and `api` (no browser, `tests/api`).                |
| `src/config/env.ts`                  | The only place that reads `process.env`. Typed, validated, documented in `.env.example`. |
| `src/fixtures/test.ts`               | The only `test`/`expect` specs may use. Provides page objects, `api`, user data.         |
| `src/pages/*.ts`                     | One class per URL. Locators + business actions. No assertions.                           |
| `src/pages/components/*.ts`          | UI shared by several pages (header, cart table, added-to-cart modal).                    |
| `src/api/api-transport.ts`           | HTTP + envelope decoding only. No endpoint knowledge.                                    |
| `src/api/automation-exercise-api.ts` | One typed method per documented endpoint (`/api_list`).                                  |
| `src/api/models.ts`                  | Response types and runtime shape checks.                                                 |
| `src/data/*.ts`                      | Test-data factories and verified catalogue facts. No locators, no I/O.                   |
| `src/reporting/report-metadata.ts`   | `reportMetadata()`: Allure labels as native Playwright annotations.                      |
| `allurerc.mjs`                       | Allure Report 3 config: report name, failure categories.                                 |
| `tests/ui/*.spec.ts`                 | Browser journeys.                                                                        |
| `tests/api/*.api.spec.ts`            | API contract tests. Never use a browser.                                                 |
| `scripts/framework-rules.ts`         | AST guardrails run by `npm run validate:framework` (unit-tested).                        |

## Non-negotiable rules

### Specs

1. Import only `{ expect, test }` from `src/fixtures/test.ts`. Never import values from `@playwright/test`, `src/pages/` or `src/api/` in a spec.
2. Get every page object, component and the API client through fixtures. Never `new` them in a spec.
3. No locators in specs (`locator`, `getBy*`, `$`). Assert on `Locator`s exposed by page objects. `expect(page).toHaveURL(...)` is allowed.
4. API specs (`tests/api/*.api.spec.ts`) use only `api` and data fixtures — never `page`, `context`, `browser` or raw `request`.
5. Each test is independent: it creates its own data via fixtures, never relies on another test or on execution order, and must pass under `fullyParallel`.
6. Test titles describe business behaviour: `'a logged-in shopper buys a product and receives an order confirmation'`, not `'test checkout 1'`.
7. Assert business outcomes (headings, cart lines, stored user data, response codes + messages). Do not assert CSS, counts of unrelated elements, or implementation details.
8. Use `test.step()` for multi-stage journeys so reports read as a narrative.

### Page objects and components

1. One class per page URL in `src/pages/<name>-page.ts`, class `<Name>Page`; constructor takes `Page` only.
2. Expose `readonly` `Locator`s for things specs assert, and `async` business methods (`login(credentials)`, `addToCart(quantity)`) returning `Promise<void>` or another page object/component.
3. Never import or call `expect` in `src/pages/`. Synchronise with `locator.waitFor()`, `page.waitForURL()` or `page.waitForLoadState()`.
4. Create a component in `src/pages/components/` only when the same UI appears on more than one page.
5. Every new page class must be registered in `src/fixtures/test.ts` (`PageFixtures` + `test.extend`). The validator fails otherwise.
6. No `BasePage`. Share behaviour through components, not inheritance.

### Locator policy (in order of preference)

1. `getByRole(role, { name })` — scope to a container when the name is not unique.
2. `getByTestId('...')` — `testIdAttribute` is `data-qa`, so this targets the site's `data-qa` hooks.
3. `getByLabel` / `getByPlaceholder` / `getByText({ exact: true })`.
4. CSS id or class **only** when the element has no role, name or `data-qa`; add a one-line comment saying why.
5. Never: XPath, `nth()`/index-based selection when a filter is possible, `{ force: true }`.
6. `locator.filter({ has })` resolves `has` relative to each candidate, so build the inner locator from `page`, not from an ancestor container.

### Synchronisation

- No `waitForTimeout`, `setTimeout`, or `networkidle`. Use web-first assertions (`await expect(locator).toBeVisible()`) in specs and `waitFor`/`waitForURL` in page objects.
- Many buttons on this site are jQuery handlers bound by an inline script at the end of `<body>`. When a click on an `<a>` without `href` does nothing, wait for `domcontentloaded` before clicking and assert the resulting URL (see `CartPage.proceedToCheckout`).
- Retries are 0 by default. Do not add retries to make a test pass.

### API layer

1. Every response is HTTP 200 with `text/html`; the real outcome is the JSON `responseCode`. Never check `response.status()` for business outcomes.
2. Add endpoints as methods on `AutomationExerciseApi`, using `ApiTransport.get/send`. Never call `request.get/post` anywhere else.
3. Verify an endpoint against https://automationexercise.com/api_list **and** a real call before adding it. Do not invent endpoints or fields.
4. Single-outcome methods enforce `responseCode` with `expectResponseCode`; methods whose outcome is under test return `ApiMessage`.
5. Parse responses with `src/api/models.ts` readers so shape errors name the bad field.

### Test data

1. Users come from `buildUser(overrides)` or the `newUser` / `registeredUser` fixtures. Never share a user between tests or hard-code an email.
2. `newUser` = not yet registered, cleaned up after the test. `registeredUser` = created via API before, deleted after.
3. Static catalogue facts live in `src/data/catalogue.ts` (verified against the API). Add new facts there, not in specs.
4. No string-literal passwords, tokens or keys anywhere (validator rule `no-hardcoded-secrets`). Generate them or read them from `env`.
5. New environment variables: read in `src/config/env.ts`, document in `.env.example` (validator checks both directions).

### Reporting (Allure + Playwright HTML)

1. Every `test.describe` declares `{ annotation: reportMetadata({ layer, epic, feature }) }`. Reuse an existing epic (`Shopper accounts`, `Catalogue`, `Shopping`) unless the feature is genuinely new.
2. Every test declares `annotation: reportMetadata({ severity })`. `blocker` = checkout cannot complete; `critical` = core journey or contract; `normal` = secondary/negative path; `minor` = edge-case validation.
3. Tag a test `@smoke` only if it is on the critical path and fast enough to run on every change.
4. Never import `allure-js-commons`, `allure-playwright` or `allure` in specs (validator rule `spec-reporter-agnostic`). Use `reportMetadata()` and `test.step()`.
5. API calls are reported automatically by `ApiTransport` (one step per call, masked request + raw response). Do not attach API traffic manually. Any new secret-like form field must match the transport's mask pattern (`password|token|secret`).
6. When a new class of failure needs triage, add a category to `allurerc.mjs` and prove it by running a deliberately failing spec once; do not commit that spec.

### Cleanup

- Anything a test creates on the server must be removed in fixture teardown (code after `await use(...)`), not at the end of the test body, so it runs even when the test fails.
- Cleanup must be idempotent and must throw on unexpected results; never swallow errors.

## Prohibited

`waitForTimeout`, `setTimeout` sleeps, `test.only`, `test.skip` without an issue reference, `page.pause()`, `{ force: true }`, empty `catch`, raw `request` in specs, `new XxxPage()` in specs, `expect` in page objects, real personal data, hard-coded credentials, editing generated folders (`test-results/`, `playwright-report/`), adding dependencies without a reason recorded in `DECISIONS.md`.

## Required commands before you finish

```bash
npm run validate          # typecheck + lint + format:check + guardrail unit tests + validate:framework + test discovery
npm run test:api          # if you touched src/api, src/data, src/fixtures or tests/api
npm run test:ui           # if you touched src/pages, src/fixtures or tests/ui
npx playwright test <file> --repeat-each=3   # for any new or changed spec
npm run test:allure -- <file>                 # if you touched reporting: check labels/steps in allure-results/
```

Run `npm run format` to fix formatting. If a test fails because the public site is down or changed, say so explicitly; do not weaken assertions to make it pass.

---

## How the framework works

### Request flow

```text
spec (tests/ui or tests/api)
  └─ test fixture from src/fixtures/test.ts
       ├─ page objects  ──> Playwright `page` (test-scoped, from built-in fixture)
       ├─ api           ──> AutomationExerciseApi ──> ApiTransport ──> built-in `request`
       └─ newUser / registeredUser ──> buildUser() + api (setup and teardown)
```

- Fixtures are lazy: a test that only asks for `api` never launches a browser.
- All fixtures are test-scoped; nothing is shared between tests.
- The `context` fixture aborts ad/consent hosts when `BLOCK_THIRD_PARTY_ADS` is on.

### Fixture catalogue

| Fixture                                                      | Type                    | Lifecycle                                                   |
| ------------------------------------------------------------ | ----------------------- | ----------------------------------------------------------- |
| `header`                                                     | `SiteHeader`            | per test                                                    |
| `homePage`, `loginPage`, `signupPage`, `accountCreatedPage`  | page objects            | per test                                                    |
| `productsPage`, `productDetailsPage`                         | page objects            | per test                                                    |
| `cartPage`, `checkoutPage`, `paymentPage`, `orderPlacedPage` | page objects            | per test                                                    |
| `api`                                                        | `AutomationExerciseApi` | per test, wraps built-in `request` (uses `baseURL`)         |
| `newUser`                                                    | `UserAccount`           | built before the test; `deleteAccountIfExists` after        |
| `registeredUser`                                             | `UserAccount`           | created via `POST /api/createAccount` before; deleted after |

### Decision table: where does my change go?

| You need to…                                  | Do this                                                                               |
| --------------------------------------------- | ------------------------------------------------------------------------------------- |
| Interact with a page that has no class yet    | New `src/pages/<name>-page.ts` + register fixture (below).                            |
| Interact with UI that exists on several pages | New `src/pages/components/<name>.ts`, expose on pages that render it.                 |
| Assert something new on an existing page      | Add a `readonly` `Locator` to that page object.                                       |
| Call a new API endpoint                       | Verify contract (below), add method on `AutomationExerciseApi`, parse in `models.ts`. |
| A user with specific data                     | `buildUser({ … })`, or extend data fixtures.                                          |
| Shared setup (e.g. pre-filled cart)           | New test-scoped fixture with teardown in `src/fixtures/test.ts`.                      |
| A new config knob                             | `src/config/env.ts` + `.env.example`.                                                 |

### When to create a page object

Create one when a spec needs a page with no class yet. Do **not** add pages
"for completeness" (`HomePage`, `ContactUsPage`, …) until a test needs them.

Actions wait for postconditions; example — `ProductDetailsPage.addToCart` returns
the modal component after it opens.

### Extending a fixture

Add the type to `PageFixtures` (or `ApiFixtures` / `DataFixtures`), then:

```ts
contactUsPage: async ({ page }, use) => use(new ContactUsPage(page)),
```

Data fixtures that create server state must clean up after `use` (see
`registeredUser` in `src/fixtures/test.ts`).

### Verifying an API contract before coding

Documented codes on `/api_list` are **body** `responseCode`, not HTTP status:

```bash
curl -s -i -X POST -d "search_product=top" https://automationexercise.com/api/searchProduct | head -5
```

Add a method on `AutomationExerciseApi` and parsers in `models.ts`. Failures
surface as `ApiContractError` with operation, URL, codes and body preview.

### Isolated test data

`buildUser()` — unique `name` / `email` / `password` per call; deterministic
address and profile fields unless overridden.

### Guardrails and limits

`npm run validate:framework` runs AST rules from `scripts/framework-rules.ts`:

| Rule id                         | What it enforces                                                            |
| ------------------------------- | --------------------------------------------------------------------------- |
| `required-file`                 | Docs, config and fixture entry point exist.                                 |
| `required-script`               | npm scripts exist and target the right project/tool.                        |
| `env-hygiene`, `env-documented` | `.env` ignored; `.env.example` ⇄ `src/config/env.ts` in sync.               |
| `spec-location`, `spec-naming`  | Only `*.spec.ts` in `tests/ui` / `tests/api`; API specs end `.api.spec.ts`. |
| `spec-uses-fixtures`            | Specs import `test`/`expect` from the fixtures module.                      |
| `spec-no-manual-construction`   | Specs don't import page/API classes as values.                              |
| `spec-no-raw-locators`          | No `locator`/`getBy*`/`$` in specs.                                         |
| `spec-uses-api-client`          | No raw `request` in specs.                                                  |
| `api-spec-no-browser`           | API specs don't request `page`/`context`/`browser`.                         |
| `page-object-no-assertions`     | `src/pages` never imports `expect`.                                         |
| `page-object-has-fixture`       | Every page class is registered in the fixtures.                             |
| `spec-reporter-agnostic`        | No `allure` imports in specs; use `reportMetadata()`.                       |
| `no-hardcoded-secrets`          | No literal passwords/tokens in code.                                        |

ESLint covers generic Playwright/TS hazards. Rules are syntactic — see
`scripts/framework-rules.test.ts` for limits and false-positive cases.

### Reporting pipeline

Playwright HTML report for debugging (screenshot/video on failure). Allure for
labels, API steps, and failure categories. Specs use `reportMetadata()` only;
`ApiTransport` attaches masked API traffic per call. Categories in
`allurerc.mjs` match failure messages (e.g. `ApiContractError`).

---

## Adding tests: recipes

### Recipe 1 — UI test with existing page objects

File: `tests/ui/<feature>.spec.ts`.

```ts
import { expect, test } from '../../src/fixtures/test.ts';
import { knownProducts } from '../../src/data/catalogue.ts';
import { reportMetadata } from '../../src/reporting/report-metadata.ts';

const metadata = reportMetadata({ layer: 'ui', epic: 'Shopping', feature: 'Cart' });

test.describe('Cart', { annotation: metadata }, () => {
  test(
    'a guest can add a product to the cart from its detail page',
    { annotation: reportMetadata({ severity: 'normal' }) },
    async ({ productDetailsPage, cartPage }) => {
      const product = knownProducts.blueTop;

      await productDetailsPage.goto(product.id);
      const modal = await productDetailsPage.addToCart();
      await modal.viewCart();

      await expect(cartPage.items.productRows).toHaveCount(1);
      await expect(cartPage.items.line(product.name).quantity).toHaveText('1');
    },
  );
});
```

### Recipe 2 — logged-in UI test

Use `registeredUser` for tests that need an account; use `newUser` when the test
registers via the signup UI.

```ts
test('shows the shopper name after login', async ({ loginPage, header, registeredUser }) => {
  await loginPage.goto();
  await loginPage.login(registeredUser);
  await expect(header.loggedInBanner).toHaveText(`Logged in as ${registeredUser.name}`);
});
```

### Recipe 3 — UI test needing a new page

1. Pick locators per the locator policy above (`codegen` or `test:debug`).
2. Add `src/pages/<name>-page.ts` (constructor takes `Page` only).
3. Register in `src/fixtures/test.ts` — `validate:framework` fails until you do.
4. Write the spec as in Recipe 1.

### Recipe 4 — API test (existing client method)

File: `tests/api/<feature>.api.spec.ts`. Only `api` and data fixtures.

```ts
test('verifyLogin confirms a registered account', async ({ api, registeredUser }) => {
  expect(await api.verifyLogin(registeredUser)).toEqual({
    responseCode: 200,
    message: 'User exists!',
  });
});
```

### Recipe 5 — API test for a new endpoint

1. Verify with `curl` against the live site and `/api_list`.
2. Add types/parsers in `src/api/models.ts`.
3. Add method on `AutomationExerciseApi`.
4. Add `tests/api/<feature>.api.spec.ts`.

(Example walkthrough for `GET /api/brandsList` was run green on the live site
before being documented, then reverted — follow the same three-file pattern.)

### Recipe 6 — scenario-specific data

```ts
const canadian = buildUser({ title: 'Mr', address: { country: 'Canada', city: 'Toronto' } });
```

Prefer a fixture if several tests need the same variant.

### Checklist before you finish

```bash
npm run format
npm run validate
npx playwright test tests/<area>/<file> --repeat-each=3
npm run test:api   # and/or npm run test:ui
```

- [ ] Business-behaviour title and outcome assertions.
- [ ] No locators in specs; server data cleaned in fixture teardown.
- [ ] Live-site verification for new catalogue or API facts.
- [ ] Update this file if you change a documented pattern.
