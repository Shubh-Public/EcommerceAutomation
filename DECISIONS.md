# Architecture decisions

## 1. Fixtures for pages, components for shared UI

---

## 2. New user per test, API create/delete in fixtures

## buildUser for unique email/password, registeredUser created/deleted via API around each test. Signup UI only in the signup test.

---

## 4. Separate Playwright projects for UI and API

## ui (Chromium, tests/ui) and api (tests/api, no browser). Same test fixture file

---

## 5. Creation of user should be through API for login cases instead of API

---

## 6. Testdata should be separate for each testcase , so no conflict occurs so everytime it creates a new user for each tescases.(authentication.spec.ts)

---

## 7. Assertion for the API data with the UI data as we have done in the Product-discovery.spec.ts file for the search prroduct.
