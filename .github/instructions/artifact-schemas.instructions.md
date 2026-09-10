---
description: "Use when reading or writing pipeline artifacts (test-plan.md, exploration.md, test-cases.md, testcases.json) to keep their internal structure consistent across all Skills."
applyTo: "artifacts/**/*.md, artifacts/**/testcases.json"
---

# Artifact Content Contracts

These are the required section/field contracts for each pipeline artifact. Skills must produce output matching these contracts so downstream Skills can parse it reliably. See [artifact-naming.instructions.md](./artifact-naming.instructions.md) for file/folder naming.

Per the simplified Qatalyst pipeline, exactly three story artifacts exist: `test-plan.md`, `exploration.md`, `test-cases.md` (plus `testcases.json`, its machine-readable companion). `requirements.md`, `test-design.md`/`.json`, `test-validation.md`/`.json`, and `reuse-decision.json`/`api-reuse-decision.json` are retired - see [test-plan-generator/README.md](../skills/test-plan-generator/README.md) and [02.5_intelligent-reuse-enforcement.hook.md](../hooks/02.5_intelligent-reuse-enforcement.hook.md) for where their responsibilities went.

## test-plan.md (Test Plan Generator, or Input Normalizer for `manual-test-case`)

Required sections, in order: Acceptance Criteria, Positive Scenarios, Negative Scenarios, Boundary Scenarios, Priority, Test Data / Dependencies, Automation Scope, Execution Order, Risk Areas, Gaps / Limitations, Environment. See [test-plan-template.md](../templates/test-plan-template.md).

- Every scenario has a stable **Scenario ID** in the form `SC-###`, assigned once - this is the same ID space every downstream artifact uses, not a separate one.
- Every scenario's trace references at least one real `AC-#`; every `AC-#` appears as either covered by >=1 scenario or listed under Gaps/Limitations with a reason.
- Scenarios are technology-neutral: no locators, no API call syntax. Each carries an Automation Scope classification (automation candidate / manual candidate / unclear) with a one-line, substantive reason - "can be automated" is not sufficient.
- This file also carries the quality/traceability judgment a separate Test Validator used to provide - a plan that fails that judgment in a blocking way (e.g. an AC with zero scenarios and zero justification) is not written; the blocker is reported instead. See [test-plan-generator/README.md](../skills/test-plan-generator/README.md)'s Internal Quality Gate.

## exploration.md (Playwright Browser Exploration)

Required sections, in order: Application Map, Navigation Flow, Screens Explored, UI Controls, Tables, Forms, Buttons, Dropdowns, Dialogs, Recommended Locators, Accessibility Information, Screenshots Produced. See [exploration-template.md](../templates/exploration-template.md).

- Recommended Locators must list each element with: page/component, description, locator strategy (role/label, `data-testid`, `id`, other), and locator value.
- Always produced, even when exploration itself was skipped entirely because existing automation already covers the story in full - in that case this file records the reuse information (which Page Object/methods were reused, and that no browser session ran) instead of live findings.

## test-cases.md (Test Case Documenter - human readable)

For each test case: **Test Case ID** (`TC-###`, matching `testcases.json`), Title, Preconditions, Steps (numbered, with expected result per step), Overall Expected Result, Priority, Linked Scenario ID, Linked Requirement.

## testcases.json (Test Case Documenter - machine readable)

Must validate against [testcases.schema.json](../schemas/testcases.schema.json). Key rules:

- `id` matches the corresponding entry in `test-cases.md`.
- `linkedScenario` matches a Scenario ID from `test-plan.md`.
- `linkedRequirement` references acceptance criteria (`AC-#`) from `test-plan.md`.
- `generatedFrom` always references both `test-plan.md` and `exploration.md` - every route produces both before `testcases.json` exists.
- `automationStatus` starts as `planned` and is updated to `automated` only after the Test Script Generator Skill produces a passing spec, or `blocked`/`not-automated` when generation is intentionally skipped.
