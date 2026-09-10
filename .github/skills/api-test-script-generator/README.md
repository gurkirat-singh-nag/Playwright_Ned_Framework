# API Test Script Generator

## Purpose

The API equivalent of `test-script-generator`: generate executable API test specs for the target repository's test runner by combining `clients/` with `testcases.json`.

## Inputs

- `clients/` (or the target repository's equivalent API client directory)
- `artifacts/<slug>/testcases.json`
- `index/framework-profile.json` (`testRunner`)

## Outputs

- `tests/` - one `<Feature>ApiTest.spec.js` per feature/story, one test per `testcases.json` entry scoped `technology: "API"`/`"both"`, using whichever assertion/runner idiom `testRunner` reports (e.g. Playwright Test's `test`/`expect`, Jest's `describe`/`it`/`expect`). `ApiTest` (not `Test`) disambiguates from the UI spec generated for the same feature by `test-script-generator`, per [naming.instructions.md](../../instructions/naming.instructions.md).

## Artifacts Consumed

- `clients/` and `testcases.json` only. This Skill must never contact Jira, Confluence, or a live API directly beyond what the generated test itself calls at run time.

## Execution Steps

1. Read `testcases.json` and the client method(s) referenced by each test case's `requiredApiClients`.
2. For each in-scope test case, check whether a corresponding spec already exists in `tests/` and is up to date; if so, skip it.
3. Otherwise, compose a test using the required client method(s): call the operation, assert on status code and response schema per `api-exploration.md`'s recorded contract, and cover the documented error case(s) where the test case calls for it.
4. Reuse existing test data/fixture conventions already present in the target repository (e.g. `utils/testDataUtils.json`) rather than inlining literals.
5. Write `tests/`.

## Failure Handling

- `clients/` or `testcases.json` missing: stop the pipeline and report the missing upstream artifact.
- A test case's `requiredApiClients` references a client method that does not exist: stop and flag it back to API Client Generator rather than duplicating request logic inline in the spec.

## Retry Strategy

- Retry only transient file read/write errors (up to 3 attempts). Missing client functionality is not retried - it is reported.

## Logging

- Log: specs generated vs. skipped (already up to date), and any client-method gaps flagged.

## Future Extensions

- Contract-based response schema assertion helpers shared across generated specs.
- Parallel/data-driven API test generation for parameterized scenarios.
