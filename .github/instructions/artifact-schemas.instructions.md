---
description: "Use when reading or writing pipeline artifacts (requirements.md, exploration.md, test-plan.md, test-cases.md, testcases.json) to keep their internal structure consistent across all Skills."
applyTo: "artifacts/**/*.md, artifacts/**/testcases.json"
---

# Artifact Content Contracts

These are the required section/field contracts for each pipeline artifact. Skills must produce output matching these contracts so downstream Skills can parse it reliably. See [artifact-naming.instructions.md](./artifact-naming.instructions.md) for file/folder naming.

## requirements.md (Jira Story Analyzer)

Required sections, in order: Story Summary, Functional Requirements, Business Rules, Acceptance Criteria, URLs, Validation Messages, User Workflows, Test Data, Test Scenarios, Risks, Assumptions, Open Questions.

- Acceptance criteria must be individually identifiable (numbered or bulleted) so `test-plan.md` and `testcases.json` can reference them by index or short code.

## exploration.md (Playwright Browser Exploration)

Required sections, in order: Discovered URLs, Locators, Navigation Flow, Forms, Validation Messages, Product Information, Application Map.

- Locators section must list each element with: page/component, description, locator strategy (role/label, `data-testid`, `id`, other), and locator value.

## test-design.md / test-design.json (Test Architect)

Required sections in `test-design.md`, in order: Acceptance Criteria, Scenarios, Coverage, Risks, Test Data, Automation / Manual Classification, Gaps, Limitations. `test-design.json` must validate against [test-design.schema.json](../schemas/test-design.schema.json).

- Every scenario has a stable **Scenario ID** in the form `SC-###`, assigned once here - this is the same ID space `test-plan.md` uses, not a separate one.
- Every scenario's `acceptanceCriteria` references at least one real `AC-#` from `requirements.md`; every `AC-#` appears in `coverage` as either covered or listed under `gaps` with a reason.
- Scenarios are technology-neutral: no locators, no API call syntax. Each carries a `technology` classification (`UI`/`API`/`both`/`integration`/`manual-only`) and an `automationCandidate` (`true`/`false`/`"unclear"`) with a one-line `reason`.
- `existingCapabilityHint`, when present, is a coarse guess only (e.g. "Likely reusable: login capability") - never a resolved method/class match. Exact reuse matching stays the reuse-enforcement hook's job.

## test-validation.md / test-validation.json (Test Validator)

Required sections in `test-validation.md`, in order: Status, Acceptance Criteria Coverage, Issues, Scenario Quality / Automation Feasibility / Risk Review, Duplicate / Overlapping Scenarios, Technology Consistency, Recommendations. `test-validation.json` must validate against [test-validation.schema.json](../schemas/test-validation.schema.json).

- `status` is one of `PASS` / `PASS_WITH_WARNINGS` / `BLOCKED`. `BLOCKED` is a hard gate - the invoking agent must not proceed to capability discovery or generation.
- Every issue has a `severity` (`BLOCKER`/`WARNING`/`INFO`), a `category`, and a `description`; never a silent auto-repair of the thing it's reporting on.
- Artifact integrity failures (invalid JSON in `test-design.json` or any other pipeline artifact present for the slug, e.g. `testcases.json`) are always `BLOCKER` and are reported, never repaired.

## test-plan.md (Test Plan Generator)

Required sections, in order: Positive Scenarios, Negative Scenarios, Boundary Tests, Execution Order, Dependencies, Risk Areas, Success Criteria, Priority.

- Every scenario must have a stable **Scenario ID** in the form `SC-###` (e.g. `SC-014`), assigned once and never reused for a different scenario.
- Every scenario must cite the requirement or acceptance criterion it traces back to.
- When `test-design.md`/`test-design.json` exists for this slug, its scenarios (and their `SC-###` IDs) are the primary input - carry them through rather than re-deriving scenarios from `requirements.md`/`exploration.md` from scratch. Fall back to the original derivation only when no test design exists.

## test-cases.md (Test Case Documenter - human readable)

For each test case: **Test Case ID** (`TC-###`, matching `testcases.json`), Title, Preconditions, Steps (numbered, with expected result per step), Overall Expected Result, Priority, Linked Scenario ID, Linked Requirement.

## testcases.json (Test Case Documenter - machine readable)

Must validate against [testcases.schema.json](../schemas/testcases.schema.json). Key rules:

- `id` matches the corresponding entry in `test-cases.md`.
- `linkedScenario` matches a Scenario ID from `test-plan.md`.
- `linkedRequirement` references acceptance criteria from `requirements.md`.
- `automationStatus` starts as `planned` and is updated to `automated` only after the Test Script Generator Skill produces a passing spec, or `blocked`/`not-automated` when generation is intentionally skipped.
