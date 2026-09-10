# Test Script Generator

## Purpose

Generate executable test specs for the target automation framework by combining `testcases.json`, `exploration.md`, and existing `page-objects/` - reusing existing Page Objects whenever one already covers a required interaction.

## Inputs

- `testcases.json`
- `exploration.md`
- `page-objects/` (existing and newly generated)

## Outputs

- `tests/`

## Artifacts Produced

- `tests/` - one `<Feature>Test.spec.js` per feature/story, one test per `testcases.json` entry, following [playwright.instructions.md](../../instructions/playwright.instructions.md) (CommonJS `require`, `test.describe`/`test`/`expect`).

## Artifacts Consumed

- `testcases.json`, `exploration.md`, and `page-objects/` only. This Skill must never contact Jira, Confluence, or the live application directly.

## Execution Steps

1. Read `testcases.json` and the Page Objects referenced by each test case's `requiredPageObjects`, consulting `exploration.md` for any locator/navigation context not already captured on the Page Object itself.
2. For each test case, check whether a corresponding test already exists in `tests/` and is up to date; if so, skip it.
3. Otherwise, compose a test using the required Page Object(s) - reuse an existing method whenever one already covers the interaction; never duplicate one that already exists. Reuse `utils/testDataUtils.json` for test data and `auth.json` storage state where the flow requires an authenticated session.
4. Write `tests/`.

## Failure Handling

- `testcases.json` or `exploration.md` missing: stop the pipeline and report the missing upstream artifact.
- A test case's `requiredPageObjects` references a Page Object method that does not exist: stop and flag it back to Page Object Generator rather than duplicating logic inline in the spec.

## Retry Strategy

- Retry only transient file read/write errors (up to 3 attempts). Missing Page Object functionality is not retried - it is reported.

## Logging

- Log: specs generated vs. skipped (already up to date), and any Page Object gaps flagged.

## Future Extensions

- Multi-framework script generation (Cypress, Selenium).
- Parallel execution tagging and data-driven test generation.
