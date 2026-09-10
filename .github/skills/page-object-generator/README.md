# Page Object Generator

## Purpose

Generate reusable Page Objects for the target automation framework using locator evidence from `exploration.md` and the pages/components required by `testcases.json`.

## Inputs

- `exploration.md`
- `testcases.json`

## Outputs

- `page-objects/`

This Skill never writes to `index/page-objects/` - see "What This Skill Must NOT Do" below.

## Artifacts Produced

- `page-objects/` - one Page Object class per page/component required by `testcases.json`, following [page-object.instructions.md](../../instructions/page-object.instructions.md) (CommonJS class, `camelCase` name with `Page` suffix, `module.exports`).

## Artifacts Consumed

- `exploration.md` and `testcases.json` only. This Skill must never contact Jira, Confluence, or the live application directly - if a required locator is missing from `exploration.md`, it is flagged, not re-explored ad hoc. `exploration.md` is authoritative evidence for observed locators and explored behavior; this Skill applies the repository's established Page Object/test coding conventions when deciding how that evidence is represented in code.

## Execution Steps

1. Read `testcases.json` to determine every distinct `targetPage` required.
2. For each required page, check whether a matching Page Object already exists in the project's `page-objects/` folder. Before modifying an existing Page Object, inspect its existing locators and methods and determine whether the required behavior can already be implemented by reuse:
   - **A method for the required action already exists**: reuse it - do not create a duplicate method.
   - **A locator for the required action already exists, but no matching method does**: reuse the existing locator. Do not automatically create a new wrapper method for it - use the locator directly when that is consistent with the project's established test/Page Object convention; if the project's convention requires Page Object action methods for this kind of interaction, a new method may be added.
   - **The required locator is missing**: extend the existing Page Object with the newly required locator and its corresponding action/accessor, but only for the behavior actually required by the explored evidence.

   Existing Page Object modification is allowed when genuinely required by the new behavior, but must be limited to the required change.
3. For each page without any matching Page Object, create a new one, using the locator strategy priority documented in `exploration.md`: `getByRole`/`getByPlaceholder`/`getByLabel` > `data-testid` > stable `id` > other.
4. Update each test case's `requiredPageObjects` field in `testcases.json` to reflect the Page Object(s) it depends on.
5. Write `page-objects/`.

## What This Skill Must NOT Do

- Must NOT create, update, regenerate, or validate any file under `index/page-objects/` - the index is entirely developer-maintained (see [02.5_intelligent-reuse-enforcement.hook.md](../../hooks/02.5_intelligent-reuse-enforcement.hook.md)). If this Skill creates or modifies a Page Object, keeping its index entry current afterward is a developer task, not something this Skill does automatically.
- Must NOT modify an existing Page Object merely to wrap an already-existing locator in a new method unless the repository's established convention requires such a method.
- Must NOT create a duplicate locator or a duplicate method for behavior an existing Page Object already exposes.

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
