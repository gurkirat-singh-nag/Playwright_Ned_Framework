# Page Object Generator

## Purpose

Generate reusable Page Objects for the target automation framework using locator evidence from `exploration.md` and the pages/components required by `testcases.json`.

## Inputs

- `exploration.md`
- `testcases.json`

## Outputs

- `page-objects/`

## Artifacts Produced

- `page-objects/` - one Page Object class per page/component required by `testcases.json`, following [page-object.instructions.md](../../instructions/page-object.instructions.md) (CommonJS class, `camelCase` name with `Page` suffix, `module.exports`).

## Artifacts Consumed

- `exploration.md` and `testcases.json` only. This Skill must never contact Jira, Confluence, or the live application directly - if a required locator is missing from `exploration.md`, it is flagged, not re-explored ad hoc.

## Execution Steps

1. Read `testcases.json` to determine every distinct `targetPage` required.
2. For each required page, check whether a matching Page Object already exists in the project's `page-objects/` folder; if so, reuse it.
3. For each page without an existing Page Object, generate one using the locator strategy priority documented in `exploration.md`: `getByRole`/`getByPlaceholder`/`getByLabel` > `data-testid` > stable `id` > other.
4. Update each test case's `requiredPageObjects` field in `testcases.json` to reflect the Page Object(s) it depends on.
5. Write `page-objects/`.

## Failure Handling

- `exploration.md` or `testcases.json` missing: stop the pipeline and report the missing upstream artifact.
- Required locator missing or unstable in `exploration.md`: flag the gap in the generation output instead of guessing a selector; do not block the entire Skill unless every page is affected.

## Retry Strategy

- Retry only transient file read/write errors (up to 3 attempts). Locator gaps are not retried - they are reported.

## Logging

- Log: pages generated vs. pages reused, and any locator gaps flagged.

## Future Extensions

- Component-object-model support for shared UI widgets.
- Multi-framework Page Object output (Selenium, Cypress).
