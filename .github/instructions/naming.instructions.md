---
description: "Use when naming pipeline artifacts, folders, Page Objects, test specs, or test case/scenario IDs. Enterprise naming conventions for the test automation pipeline."
applyTo: "artifacts/**, **/page-objects/**, **/*.spec.js"
---

# Naming Conventions

## Artifact Pipeline Folder

Every request is processed under a single per-request working directory, keyed by a stable slug:

```
artifacts/<slug>/
├── requirements.md
├── test-design.md
├── test-design.json
├── test-validation.md
├── test-validation.json
├── exploration.md
├── screenshots/
├── test-plan.md
├── test-cases.md
├── testcases.json
├── page-objects/
└── tests/
```

- Derive `<slug>` from the Jira Story ID when available (e.g. `artifacts/PROJ-1234/`).
- If no Jira ID exists, derive a kebab-case slug from the requirement's short title (e.g. `artifacts/guest-checkout-flow/`).
- Reuse the same slug across a resumed pipeline run; never create a second directory for the same requirement.
- Artifact file names are fixed and lowercase exactly as shown above - never version them (no `requirements-v2.md`).

## Identifiers

- Acceptance Criterion ID: `AC-#` (e.g. `AC-3`), reused from `requirements.md` when already numbered there, or assigned in that order by Test Architect when the source is unnumbered prose.
- Scenario ID: `SC-###` (e.g. `SC-014`), assigned once in `test-design.md`/`test-design.json` by Test Architect, carried through unchanged into `test-plan.md`, never reused for a different scenario.
- Test Case ID: `TC-###` (e.g. `TC-101`), assigned once in `test-cases.md` / `testcases.json`, and referenced in generated spec titles.

## Page Objects

- One class per page or major reusable component, in the project's existing `page-objects/` folder (hyphenated).
- `camelCase` class name suffixed with `Page` (e.g. `loginPage`, `dashboardPage`), matching the project's existing convention.
- File name matches the class name exactly (e.g. `loginPage.js`).

## API Clients

- One class per resource/service, in the project's existing API client directory (`clients/`, `api/`, or `services/` - reuse whichever already exists).
- `camelCase` class name suffixed with `Client` (e.g. `userClient`, `customerClient`), mirroring the Page Object convention.
- File name matches the class name exactly (e.g. `userClient.js`).

## Test Specs

- File naming: `<Feature>Test.spec.js`, matching the project's existing convention (e.g. `loginTest.spec.js`), one file per feature unless the target project already groups differently.
- API test specs: `<Feature>ApiTest.spec.js`, disambiguating from the UI spec generated for the same feature (e.g. `loginApiTest.spec.js` alongside `loginTest.spec.js`).
- New generated tests should include the Test Case ID in the test title for traceability (e.g. `TC-101: ...`). Do not retrofit this onto existing tests that predate the pipeline.

## Screenshots

- `<step-or-scenario-slug>.png` inside `screenshots/`.
