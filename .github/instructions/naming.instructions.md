---
description: "Use when naming pipeline artifacts, folders, Page Objects, test specs, or test case/scenario IDs. Enterprise naming conventions for the test automation pipeline."
applyTo: "artifacts/**, **/pageobjects/**, **/*.spec.ts"
---

# Naming Conventions

## Artifact Pipeline Folder

Every request is processed under a single per-request working directory, keyed by a stable slug:

```
artifacts/<slug>/
├── requirements.md
├── exploration.md
├── screenshots/
├── test-plan.md
├── test-cases.md
├── testcases.json
├── pageobjects/
└── tests/
```

- Derive `<slug>` from the Jira Story ID when available (e.g. `artifacts/PROJ-1234/`).
- If no Jira ID exists, derive a kebab-case slug from the requirement's short title (e.g. `artifacts/guest-checkout-flow/`).
- Reuse the same slug across a resumed pipeline run; never create a second directory for the same requirement.
- Artifact file names are fixed and lowercase exactly as shown above - never version them (no `requirements-v2.md`).

## Identifiers

- Scenario ID: `SC-###` (e.g. `SC-014`), assigned once in `test-plan.md`, never reused for a different scenario.
- Test Case ID: `TC-###` (e.g. `TC-101`), assigned once in `test-cases.md` / `testcases.json`, and referenced in generated spec titles.

## Page Objects

- One class (or module) per page or major reusable component.
- `PascalCase` class name suffixed with `Page` (e.g. `LoginPage`, `CheckoutPage`).
- File name matches the class in the target project's existing case convention.

## Test Specs

- File naming: `<feature-or-story-slug>.spec.ts`, kebab-case, one file per feature or story unless the target project already groups differently.
- Test titles include the Test Case ID for traceability (e.g. `TC-101: ...`).

## Screenshots

- `<step-or-scenario-slug>.png` inside `screenshots/`.
