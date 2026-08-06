# Test Plan Generator

## Purpose

Convert `requirements.md` and `exploration.md` into a structured, prioritised test plan covering scenario coverage and execution strategy.

## Inputs

- `requirements.md`
- `exploration.md`

## Outputs

- `test-plan.md`

## Artifacts Produced

- `test-plan.md` - structure defined in [test-plan-template.md](../../templates/test-plan-template.md). Each scenario carries a stable Scenario ID (`SC-###`) per [naming.instructions.md](../../instructions/naming.instructions.md).

## Artifacts Consumed

- `requirements.md` and `exploration.md` only. This Skill must never contact Jira, Confluence, or the live application directly.

## Execution Steps

1. Check whether `test-plan.md` already exists and is structurally valid.
2. If valid, skip execution and reuse the existing file.
3. Otherwise, confirm both `requirements.md` and `exploration.md` exist; if either is missing, stop and report that the upstream Skill must run first.
4. Derive Positive, Negative, and Boundary scenarios from the two input artifacts.
5. Assign a Scenario ID and priority to each scenario, and determine execution order and dependencies.
6. Write `test-plan.md`.

## Failure Handling

- Required input artifact missing: stop the pipeline and report which upstream Skill must be (re-)run.
- Requirement or exploration data insufficient to plan a scenario: record it as an open question in `test-plan.md` rather than guessing.

## Retry Strategy

- This Skill is a pure derivation step; retries are only needed for transient file read/write errors (up to 3 attempts).

## Logging

- Log: scenario counts by category (positive/negative/boundary), priority distribution, and any open questions raised.

## Future Extensions

- Risk-based prioritisation scoring.
- Automatic coverage-gap detection against acceptance criteria.
