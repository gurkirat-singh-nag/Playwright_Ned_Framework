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

## test-plan.md (Test Plan Generator)

Required sections, in order: Positive Scenarios, Negative Scenarios, Boundary Tests, Execution Order, Dependencies, Risk Areas, Success Criteria, Priority.

- Every scenario must have a stable **Scenario ID** in the form `SC-###` (e.g. `SC-014`), assigned once and never reused for a different scenario.
- Every scenario must cite the requirement or acceptance criterion it traces back to.

## test-cases.md (Test Case Documenter - human readable)

For each test case: **Test Case ID** (`TC-###`, matching `testcases.json`), Title, Preconditions, Steps (numbered, with expected result per step), Overall Expected Result, Priority, Linked Scenario ID, Linked Requirement.

## testcases.json (Test Case Documenter - machine readable)

Must validate against [testcases.schema.json](../schemas/testcases.schema.json). Key rules:

- `id` matches the corresponding entry in `test-cases.md`.
- `linkedScenario` matches a Scenario ID from `test-plan.md`.
- `linkedRequirement` references acceptance criteria from `requirements.md`.
- `automationStatus` starts as `planned` and is updated to `automated` only after the Test Script Generator Skill produces a passing spec, or `blocked`/`not-automated` when generation is intentionally skipped.
