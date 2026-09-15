# Test Case Documenter

## Purpose

Convert `test-plan.md` plus `exploration.md`'s findings into human-readable manual test cases and the machine-readable `testcases.json` contract consumed by generator Skills.

## Inputs

- `test-plan.md`
- `exploration.md`

## Outputs

- `test-cases.md`
- `testcases.json`

## Artifacts Produced

- `test-cases.md` - structure defined in [test-cases-template.md](../../templates/test-cases-template.md).
- `testcases.json` - validated against [testcases.schema.json](../../schemas/testcases.schema.json); each test case includes Title, Type, Priority, Preconditions, Steps, Expected Result, Linked Requirement(s), Linked Scenario, and Automation Status. See [artifact-schemas.instructions.md](../../instructions/artifact-schemas.instructions.md) for the full field contract. `testcases.json` is a machine-readable companion to `test-cases.md`, consumed by `page-object-generator`/`test-script-generator` - not a fourth story artifact in its own right.

## Artifacts Consumed

- `test-plan.md` and `exploration.md` only. This Skill must never contact Jira, Confluence, or the live application directly.

## Execution Steps

1. Check whether `test-cases.md` and `testcases.json` already exist and are structurally valid and consistent with each other.
2. If valid, skip execution and reuse the existing files.
3. Otherwise, confirm `test-plan.md` and `exploration.md` both exist; if either is missing, stop and report which upstream step must run first.
4. Generate exactly one test case per Scenario ID in `test-plan.md`, assigning a stable Test Case ID (`TC-###`).
5. For UI-scoped scenarios, populate `targetPage` from `exploration.md`'s Application Map/Recommended Locators, and leave `requiredPageObjects` empty until Page Object Generator runs. For API-scoped scenarios, leave `requiredApiClients` empty until API Client Generator runs.
6. Write matching `test-cases.md` and `testcases.json`.

## Failure Handling

- `test-plan.md` or `exploration.md` missing or invalid: stop the pipeline and report the missing upstream artifact.
- `test-cases.md` and `testcases.json` fall out of sync (e.g. partially regenerated): treat both as invalid and regenerate both together, never one in isolation.

## Retry Strategy

- Pure derivation step; retry only transient file read/write errors (up to 3 attempts).

## Logging

- Log: test case count, category/priority breakdown, and any Scenario IDs that could not be converted into a test case.

## Future Extensions

- Export adapters for external test management tools (e.g. Zephyr, TestRail, Xray).
