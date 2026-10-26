# Automation Exercise — Playwright + TypeScript test framework

An agentic-first UI and API test framework for the public practice store
https://automationexercise.com. It covers signup/login, product discovery,
checkout through to order confirmation, and the product/account REST APIs.
It is built so that a human or an AI coding agent can add a correct test by
following documented patterns, with automated guardrails that reject
non-compliant changes.

Scope: local execution, Chromium only. CI/CD, cross-browser and performance
testing are intentionally out of scope for this submission.

## Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Commands](#commands)
- [What is tested](#what-is-tested)
- [Architecture](#architecture)
- [Debugging and reports](#debugging-and-reports)
- [Troubleshooting](#troubleshooting)
- [Limitations and external dependencies](#limitations-and-external-dependencies)

## Prerequisites

- Node.js **22.18+** (developed on 24.x). The guardrail scripts run as `.ts`
  files using Node's built-in type stripping.
- npm 10+.
- Internet access to `automationexercise.com` (the tests run against the live site).
- macOS, Linux or Windows supported by Playwright 1.64.

## Setup

```bash
git clone <repo-url> && cd <repo>
npm ci                                  # installs the exact versions in package-lock.json
npx playwright install chromium         # downloads the browser build matching @playwright/test
cp .env.example .env                    # optional: every variable has a default
```

### Running a subset

```bash
npx playwright test tests/ui/checkout.spec.ts              # one file
npx playwright test tests/ui/checkout.spec.ts:6            # one test by line
npx playwright test -g "registers a new shopper"           # by title
npx playwright test --project=api -g "lifecycle"           # title within a project
npx playwright test tests/ui/checkout.spec.ts --repeat-each=5   # stability check
npm run test:ui -- --headed -g "checkout"                  # extra flags after --
```

### Configuration

All configuration is read and validated in `src/config/env.ts`; invalid values
fail fast with a message naming the variable. No credentials are required:
tests create and delete their own throwaway users.

| Variable                | Default                          | Purpose                                                          |
| ----------------------- | -------------------------------- | ---------------------------------------------------------------- |
| `BASE_URL`              | `https://automationexercise.com` | Site under test (used by both the browser and the API client).   |
| `TEST_TIMEOUT_MS`       | `60000`                          | Per-test timeout.                                                |
| `EXPECT_TIMEOUT_MS`     | `10000`                          | Timeout for web-first assertions.                                |
| `WORKERS`               | Playwright default               | Parallel workers. 2–4 is kind to the public site.                |
| `RETRIES`               | `0`                              | Retries. Keep 0; set 1 only to capture a trace while diagnosing. |
| `BLOCK_THIRD_PARTY_ADS` | `true`                           | Abort Google ad/consent requests in UI tests.                    |

Variables can also be set inline, e.g. `WORKERS=2 npm run test:ui`.

## Commands

| Command                           | What it does                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `npm test`                        | All tests (UI + API).                                                                                               |
| `npm run test:ui`                 | UI tests only (`ui` project, Chromium).                                                                             |
| `npm run test:api`                | API tests only (`api` project, no browser launched).                                                                |
| `npm run test:headed`             | UI tests in a visible browser.                                                                                      |
| `npm run test:debug`              | UI tests with the Playwright Inspector (step through, pick locators).                                               |
| `npm run test:report`             | Open the last HTML report.                                                                                          |
| `npm run test:allure`             | Clean old Allure output, run all tests, generate `allure-report/`. Extra args after `--` go to Playwright.          |
| `npm run allure:open`             | Serve and open the generated Allure report.                                                                         |
| `npm run allure:generate`         | Rebuild `allure-report/` from the current `allure-results/`. A normal test run already does this.                   |
| `npm run allure:clean`            | Delete `allure-results/` and `allure-report/`.                                                                      |
| `npm run test:list`               | List discovered tests without running them (no network needed).                                                     |
| `npm run typecheck`               | `tsc --noEmit` with strict settings.                                                                                |
| `npm run lint` / `lint:fix`       | ESLint (type-aware + Playwright rules), zero warnings allowed.                                                      |
| `npm run format` / `format:check` | Prettier.                                                                                                           |
| `npm run test:guardrails`         | Unit tests for the framework validator rules.                                                                       |
| `npm run validate:framework`      | Project architecture guardrails (see `AGENTS.md` guardrails table).                                                 |
| `npm run validate`                | All static checks: typecheck, lint, format, guardrail tests, validator, test discovery. Stops at the first failure. |


## What is tested

| Spec                                 | Test                                                                                | Why it matters                                                                                                                                |
| ------------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/ui/authentication.spec.ts`    | registers a new shopper through the signup form and persists their details          | Full 2-step signup → "Account Created!" → logged-in banner, then the API confirms the backend stored what was typed.                          |
|                                      | logs in an existing shopper and logs out again                                      | Login with an API-provisioned user; logout returns to the login page.                                                                         |
|                                      | rejects a login with the wrong password                                             | Negative path: error shown and no session.                                                                                                    |
| `tests/ui/product-discovery.spec.ts` | search lists the same products as the search API and opens a product detail page    | Search relevance (UI results must equal the backend's search results) and product attributes (price, category, brand, availability).          |
| `tests/ui/checkout.spec.ts`          | a logged-in shopper buys a product and receives an order confirmation               | Quantity 2 → cart line (qty, unit price, total) → checkout address and review → payment → "Order Placed!" with the charged amount in the URL. |
| `tests/api/products.api.spec.ts`     | GET /api/productsList returns a well-formed catalogue                               | Shape, unique ids, price format, a known product's full record.                                                                               |
|                                      | POST /api/searchProduct returns only products matching the term by name or category | Relevance of every result.                                                                                                                    |
|                                      | POST /api/searchProduct without a search term is rejected as a bad request          | Documented 400 contract.                                                                                                                      |
| `tests/api/account.api.spec.ts`      | account lifecycle: create, verify login, read details, delete                       | Create 201 → verify 200 → details persisted → delete 200 → verify 404.                                                                        |
|                                      | verifyLogin rejects an existing email with the wrong password                       | Authentication negative path.                                                                                                                 |

Total: 5 UI tests and 5 API tests.

## Architecture

```text
.
├── playwright.config.ts        # projects: ui (Chromium, tests/ui) and api (no browser, tests/api)
├── src/
│   ├── config/env.ts           # typed, validated environment (only reader of process.env)
│   ├── fixtures/test.ts        # custom `test`: page objects, api client, self-cleaning users, ad blocking
│   ├── pages/                  # one class per URL, no assertions
│   │   ├── components/         # UI shared across pages: site header, cart table, added-to-cart modal
│   │   └── *-page.ts
│   ├── api/
│   │   ├── api-transport.ts    # HTTP + envelope decoding (responseCode lives in the body)
│   │   ├── automation-exercise-api.ts  # one typed method per documented endpoint
│   │   └── models.ts           # response types + runtime shape checks
│   ├── data/                   # user factory, test card, verified catalogue facts
│   └── reporting/report-metadata.ts  # reportMetadata(): epic/feature/severity/layer labels as annotations
├── allurerc.mjs                # Allure Report 3 config: report name, failure categories
├── tests/
│   ├── ui/*.spec.ts
│   └── api/*.api.spec.ts
├── scripts/                    # framework guardrails (AST rules) and their unit tests
├── AGENTS.md                   # rules, framework guide, and test recipes (single entry point)
├── DECISIONS.md                # architecture decisions and trade-offs
└── AI_USAGE.md                 # how AI was used, including mistakes and corrections
```

### Fixture lifecycle

`src/fixtures/test.ts` extends Playwright's built-in `test`. Everything is
**test-scoped** and lazy:

1. Playwright creates a fresh browser context and `page` per test (built-in).
2. The overridden `context` fixture registers a route that aborts ad/consent hosts.
3. Page-object fixtures wrap that `page`; a test only pays for what it requests.
4. `api` wraps the built-in `request` context, which inherits `baseURL`.
5. `newUser` builds a unique, unregistered user; after the test it is deleted
   if it exists. `registeredUser` is created via `POST /api/createAccount`
   before the test and deleted after.

Teardown code runs after `use()`, so cleanup happens even when the test fails,
and a cleanup failure fails the test rather than leaking silently.

### Locator strategy

In order of preference: `getByRole` with accessible name → `getByTestId`
(configured to read the site's `data-qa` attributes) → label/placeholder/exact
text → CSS id/class only where the site offers nothing better (product cards,
cart cells), always with a comment. No XPath, no `force`, no index-based
selection. Full policy in `AGENTS.md`.

### Test-data strategy

`buildUser()` generates unique `name`, `email` (`qa.shopper.<token>@example.com`,
a reserved domain) and `password` per call using `crypto.randomUUID`; all
other fields are deterministic and overridable. Every test gets its own user
through a fixture, so tests are safe under `fullyParallel` and never depend on
order. Static catalogue facts (e.g. "Blue Top", id 1, Rs. 500, Polo) are kept
in `src/data/catalogue.ts` and were verified against the API.

### API client

The site returns HTTP 200 and `text/html` for **every** API call; the real
outcome is the JSON `responseCode`. `ApiTransport` decodes that envelope and
raises `ApiContractError` with the operation, URL, codes and a body preview on
anything unexpected. `AutomationExerciseApi` exposes business methods
(`listProducts`, `searchProducts`, `createAccount`, `verifyLogin`, …).

### Agentic guardrails

`npm run validate` combines `tsc`, ESLint (`typescript-eslint` strict
type-checked + `eslint-plugin-playwright`), Prettier, and an AST validator for
project rules such as "specs must use fixtures", "no locators in specs",
"API specs never use a browser", "page objects don't assert", "every page has a
fixture", "no hard-coded secrets" and ".env.example matches the env module".
Each violation prints `file:line [rule] message` plus a fix hint.

## Debugging and reports

- **HTML report**: written to `playwright-report/` on every run; open with `npm run test:report`.
- **Allure report**: see [Allure reporting](#allure-reporting) below.
- **On failure**: screenshot, video and an `error-context.md` (page snapshot) are written to `test-results/<test>/` and attached to the report.
- **Traces**: recorded on the first retry. To get one for a failing test: `RETRIES=1 npx playwright test <file>`, then open it from the report or with `npx playwright show-trace test-results/<test>/trace.zip`.
- **Step through**: `npm run test:debug -- -g "<title>"` opens the Inspector; use its locator picker to find selectors.
- **Watch it run**: `npm run test:headed -- -g "<title>"`.
- **API failures**: the `ApiContractError` message contains the response body preview, and the
  request/response of every API call is attached to its report step.

### Allure reporting

Every Playwright run also writes raw results to `allure-results/` through
[`allure-playwright`](https://www.npmjs.com/package/allure-playwright). The
report is rendered by Allure Report 3 (the `allure` npm package), which runs on
Node — no Java required.

```bash
npm run test:allure                      # clean, run everything, build allure-report/
npm run test:allure -- --project=api     # any Playwright args after --
npm run allure:open                      # serve and open the report
```

Every `npx playwright test` (and `npm test` / `npm run test:ui`) clears
`allure-results/` first and rebuilds `allure-report/` when it finishes, so the
report matches that command. `npm run allure:open` serves the report already on
disk; run it after the tests finish. An Allure tab that was already open keeps
the previous report until you stop it and open it again. The exit code of
`test:allure` is the Playwright exit code, so a failing test still fails the
command.

What the report contains:

| Area                       | Source                                                                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Behaviors (epic → feature) | `reportMetadata({ epic, feature })` on each `test.describe`.                                                                                            |
| Severity, layer (ui/api)   | `reportMetadata({ severity })` per test, `layer` per describe.                                                                                          |
| Tags                       | Playwright tags, e.g. `@smoke` (also runnable: `npx playwright test --grep @smoke`).                                                                    |
| Steps                      | `test.step()` in specs, plus one step per API call (`POST /api/createAccount`) including fixture setup/teardown under Before/After Hooks.               |
| Attachments                | Masked request fields and raw response for each API call; screenshot, video and page snapshot on failure; the trace when one is recorded (first retry). |
| Categories                 | `allurerc.mjs`: site/network outage, API contract violations, timeouts, assertion failures, broken tests.                                               |
| Environment                | Base URL, Node version, OS, retries (from `playwright.config.ts`).                                                                                      |

Passwords and other secret-looking request fields are replaced with `***`
before they are attached.

## Troubleshooting

| Symptom                                                         | Cause / fix                                                                                                                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Executable doesn't exist at .../chromium...`                   | Run `npx playwright install chromium`. If `PLAYWRIGHT_BROWSERS_PATH` is set in your shell, it must point to where browsers are installed.                    |
| `Environment variable X must be ...`                            | Fix the value in `.env` or your shell; see the Configuration table.                                                                                          |
| Many tests time out at `page.goto` / API calls                  | The public site is slow or down. Check https://automationexercise.com in a browser; lower `WORKERS`. This is an environment problem, not a framework defect. |
| `ApiContractError: ... HTTP 5xx ... server-side failure`        | The site or its Cloudflare CDN failed (HTTP 520 was observed during development). Re-run; if it persists, the site is down. Not a framework defect.          |
| A click on an `<a>` without `href` does nothing                 | Its jQuery handler isn't bound yet. Wait for `domcontentloaded` before clicking (see `CartPage.proceedToCheckout`).                                          |
| Allure still shows the previous run                             | `npm run allure:open` serves the report built when the tests finished. Stop it, run the tests, then open it again.                                           |
| `npm audit` reports dompurify via `allure`                      | `package.json` `overrides` pins `dompurify` to a patched 3.4.x. Keep the override until `allure` ships a fixed version.                                      |
| Ad overlay / Google consent dialog in headed runs               | Ensure `BLOCK_THIRD_PARTY_ADS` is not `false`.                                                                                                               |
| `ApiContractError: ... expected responseCode 201, received 400` | The site rejected the generated user (e.g. contract changed). The message includes the body.                                                                 |
| `Cleanup of ... failed with responseCode ...`                   | Fixture teardown could not delete a test user; the test fails so the leak is visible.                                                                        |
| Catalogue assertions fail (Blue Top price/brand)                | The site's seed data changed. Re-verify with `curl https://automationexercise.com/api/productsList` and update `src/data/catalogue.ts`.                      |
| `validate:framework` fails                                      | Read the `fix:` line under each violation. Rules are listed in `AGENTS.md`.                                                                                  |
| `Warning: The 'NO_COLOR' env is ignored due to 'FORCE_COLOR'`   | Harmless; both variables are set in your shell.                                                                                                              |

## Limitations and external dependencies

- Tests run against a shared public site that we do not control. Downtime,
  rate limiting, or changes to its seed catalogue or markup will fail tests;
  those are environment failures, not framework defects.
- Product cards and cart cells have no roles or `data-qa` hooks, so a few
  locators use CSS classes (commented in the page objects).
- The order-confirmation check relies on the site putting the charged amount in
  the `/payment_done/<amount>` URL, which is observed behaviour, not documented.
- The site offers no documented way to cancel an order. The checkout test's
  account is deleted in teardown; whether the site keeps the order record
  afterwards is not observable. No real payment is made.
- Only Chromium is configured; no CI pipeline is included.
