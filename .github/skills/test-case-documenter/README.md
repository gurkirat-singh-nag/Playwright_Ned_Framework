# Test Case Documenter

## Purpose

Convert `test-plan.md` into human-readable manual test cases and the machine-readable `testcases.json` contract consumed by generator Skills.

## Inputs

- `test-plan.md`

## Outputs

- `test-cases.md`
- `testcases.json`

## Artifacts Produced

- `test-cases.md` - structure defined in [test-cases-template.md](../../templates/test-cases-template.md).
- `testcases.json` - validated against [testcases.schema.json](../../templates/testcases.schema.json); each test case includes Story ID, Title, Category, Priority, Preconditions, Steps, Expected Results, Tags, Dependencies, Target Page, and Required Page Objects.

## Artifacts Consumed

- `test-plan.md` only. This Skill must never contact Jira, Confluence, or the live application directly.

## Execution Steps

1. Check whether `test-cases.md` and `testcases.json` already exist and are structurally valid and consistent with each other.
2. If valid, skip execution and reuse the existing files.
3. Otherwise, confirm `test-plan.md` exists; if missing, stop and report that Test Plan Generator must run first.
4. Generate exactly one test case per Scenario ID in `test-plan.md`, assigning a stable Test Case ID (`TC-###`).
5. Populate `targetPage` from `exploration.md` context already summarised in the scenario, and leave `requiredPageObjects` empty until Page Object Generator runs.
6. Write matching `test-cases.md` and `testcases.json`.

## Failure Handling

- `test-plan.md` missing or invalid: stop the pipeline and report the missing upstream artifact.
- `test-cases.md` and `testcases.json` fall out of sync (e.g. partially regenerated): treat both as invalid and regenerate both together, never one in isolation.

## Retry Strategy

- Pure derivation step; retry only transient file read/write errors (up to 3 attempts).

## Logging

- Log: test case count, category/priority breakdown, and any Scenario IDs that could not be converted into a test case.

## Future Extensions

- Export adapters for external test management tools (e.g. Zephyr, TestRail, Xray).
