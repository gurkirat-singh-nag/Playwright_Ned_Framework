---
description: "Use when creating or reading pipeline artifacts (requirements.md, exploration.md, test-plan.md, test-cases.md, testcases.json, pageobjects, tests) to keep naming and folder layout consistent across all agents and Skills."
applyTo: "artifacts/**"
---

# Artifact Naming Conventions

Every request is processed under a single per-request working directory, keyed by a stable slug:

```
artifacts/<slug>/
├── requirements.md
├── test-design.md
├── test-design.json
├── test-validation.md
├── test-validation.json
├── reuse-decision.json          (UI pipeline only)
├── api-reuse-decision.json      (API pipeline only)
├── exploration.md               (UI pipeline only)
├── api-exploration.md           (API pipeline only)
├── screenshots/
├── test-plan.md
├── test-cases.md
├── testcases.json
├── pageobjects/                 (UI pipeline only)
└── tests/
```

`clients/` (API pipeline output) is written to the target repository's existing API client directory - `clients/`, `api/`, or `services/` - not under `artifacts/<slug>/`, mirroring how `pageobjects/` is written to the target repository's `page-objects/`, not into the per-request artifact folder.

## Slug Rules

- Derive `<slug>` from the Jira Story ID when available (e.g. `artifacts/PROJ-1234/`).
- If no Jira ID exists, derive a kebab-case slug from the requirement's short title (e.g. `artifacts/guest-checkout-flow/`).
- Reuse the same slug across a resumed pipeline run; never create a second directory for the same requirement.

## File Naming Rules

- Artifact file names are fixed and lowercase exactly as shown above - do not rename or version them (no `requirements-v2.md`).
- `testcases.json` test case IDs must match the IDs used in `test-cases.md` and referenced in generated spec titles.
- Screenshots follow `<step-or-scenario-slug>.png` inside `screenshots/`.

## Guidelines

- Do not regenerate an artifact that already exists and is still valid for the current requirement - update it in place only when the underlying requirement changed.
- Every downstream Skill must read its declared input artifact from this structure rather than being passed content ad hoc.
