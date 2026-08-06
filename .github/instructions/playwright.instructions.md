---
description: "Playwright spec conventions: POM boundaries, fixtures, waiting strategy."
applyTo: "**/*.spec.js"
---

Follow the project's Page Object Model (POM) architecture. Keep page interactions inside Page Objects (`page-objects/`) and keep test files (`tests/`) focused on test flow and assertions.

## Conventions

- Use CommonJS: `const { test, expect } = require('@playwright/test');` and `const { <pageClass> } = require('../page-objects/<pageClass>');`.
- Structure specs with `test.describe` per feature, and one `test` per test case from `testcases.json`. Use `test.describe.configure({ mode: 'serial' })` only when tests genuinely depend on prior test state (e.g. login before a dependent flow), matching the existing `loginTest.spec.js` pattern.
- Use `expect` assertions only in the spec file, never inside a Page Object.
- Reuse `auth.json` via `browser.newContext({ storageState: 'auth.json' })` for tests that depend on an authenticated session, instead of logging in again per test.
- Reuse test data from `utils/testDataUtils.json` (loaded via `JSON.parse(JSON.stringify(require('../utils/testDataUtils.json')))`) instead of hardcoding values in specs.
- Prefer Playwright's built-in auto-waiting and web-first assertions over manual `waitForTimeout` calls.
- Do not introduce a new test runner, assertion library, or reporter unless explicitly requested - this project already uses `html`, `line`, and `allure-playwright` reporters.

See [naming.instructions.md](./naming.instructions.md) for file naming and test-case-ID conventions, and [coding-standards.instructions.md](./coding-standards.instructions.md) for general enterprise standards.