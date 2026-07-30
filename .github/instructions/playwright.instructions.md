---
description: "Playwright spec conventions: POM boundaries, fixtures, waiting strategy."
applyTo: "**/*.spec.ts"
---

Follow the project's Page Object Model (POM) architecture. Keep page interactions inside Page Objects and keep test files focused on test flow and assertions.

## Conventions

- Structure specs with `test.describe` per feature/page and one `test` per test case from `testcases.json`.
- Use `expect` assertions only in the spec file, never inside a Page Object.
- Reuse existing fixtures for setup/teardown (auth, test data, browser context) instead of duplicating setup logic per spec.
- Prefer Playwright's built-in auto-waiting and web-first assertions over manual `waitForTimeout` calls.
- Do not introduce a new test runner, assertion library, or reporter unless explicitly requested.

See [naming.instructions.md](./naming.instructions.md) for file naming and test-case-ID conventions, and [coding-standards.instructions.md](./coding-standards.instructions.md) for general enterprise standards.