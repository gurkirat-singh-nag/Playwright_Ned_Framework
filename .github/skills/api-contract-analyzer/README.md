# API Contract Analyzer

## Purpose

The API equivalent of `playwright-browser-exploration`: produce a factual, evidence-based map of the API operations a story requires - request/response schemas, status codes, authentication, error shapes - as `api-exploration.md`. Framework-agnostic by design: this Skill documents the *contract*, never the client library that will eventually call it (that choice belongs to `api-client-generator`).

## Position In The Pipeline

```
Test Architect  →  test-design.json
        ↓
Test Validator  →  test-validation.json   [GATE]
        ↓ (only if not BLOCKED)
API Capability Discovery  →  api-reuse-decision.json
        ↓
API CONTRACT ANALYZER  →  api-exploration.md      ← this Skill
        ↓
Test Plan Generator / Test Case Documenter (shared with UI pipeline)
        ↓
API Client Generator  →  clients/
        ↓
API Test Script Generator  →  tests/
```

Runs inside `test-generator-api` (see [test-generator-api.agent.md](../../agents/test-generator-api.agent.md) Step 6), only reached if the Test Validator gate did not block and only for the scenarios `api-capability-discovery` did not already resolve as `FULL_REUSE`.

## Inputs

- `artifacts/<slug>/requirements.md` - the Swagger/OpenAPI URL or file (if any) and/or the plain-language endpoint description that defines exploration scope.
- `artifacts/<slug>/api-reuse-decision.json` (optional) - written by `api-capability-discovery`. When present, it scopes this Skill exactly the way `reuse-decision.json` scopes `playwright-browser-exploration`.

## Outputs

- `artifacts/<slug>/api-exploration.md` - structure: Endpoint Overview, Request Schema, Response Schema, Authentication, Error Responses, Dependencies (matches [05_artifact-validation.hook.md](../../hooks/05_artifact-validation.hook.md)'s expected sections).

## Artifacts Consumed

- `requirements.md` and `api-reuse-decision.json` only. This Skill must never contact Jira/Confluence directly - any requirement context must already be present in `requirements.md`.

## Execution Steps

### Step 0: Check Reuse Decision

If `artifacts/<slug>/api-reuse-decision.json` exists:

- A scenario resolved `FULL_REUSE` - do not analyze it. Write its section of `api-exploration.md` directly from the existing client method's recorded `httpMethod`/`endpoint` (from `artifacts/indexes/api/`), same "document what's reused, don't re-derive it" pattern as UI exploration.
- A scenario resolved `PARTIAL_REUSE` - analyze only its `missing[]` operations.
- A scenario resolved `NO_REUSE`, or no decision file exists - proceed to Step 1 in full for that scenario.

### Step 1: Check Artifact Existence

If `api-exploration.md` already exists and is structurally valid for the current requirement, skip execution and reuse it.

### Step 2: Locate The Contract Source

- If `requirements.md` references a Swagger/OpenAPI document (URL or file path), fetch/read it. A remote URL is fetched read-only; a local file is read directly. Never fetch a spec for a scenario already resolved `FULL_REUSE` (see Step 0).
- If no machine-readable spec exists, treat the plain-language endpoint description in `requirements.md` as the contract source. Anything not explicitly stated there (an undocumented field, an assumed status code) is marked as an **assumption**, never invented as fact.

### Step 3: Extract Operations

For each in-scope operation (from Step 0's scoping): HTTP method, path (including path/query parameters), request body schema, success response schema, documented error responses and status codes, and any authentication requirement (e.g. `Authorization: Bearer <token>`, API key header).

### Step 4: Record Evidence, Not Fabrication

Capture example request/response payloads only when the spec or requirements text actually provides them. A missing example is recorded as a gap, not filled with an invented sample.

### Step 5: Live API Verification (Conditional)

Only when the story explicitly requires confirming real behaviour (not the default path): issue read-only (`GET`) calls against a documented non-production/sandbox base URL to confirm response shape. Never issue a write call (`POST`/`PUT`/`PATCH`/`DELETE`) purely for exploration, and never call a production endpoint. If no safe environment is available, note the limitation instead of skipping silently.

### Step 6: Write Artifact

Write `api-exploration.md` with each operation's evidence, noting per-operation whether it came from Swagger, requirements text, or (Step 0) an existing reused client.

## Failure Handling

- Spec unreachable AND `requirements.md` has no explicit contract detail: stop the pipeline and report before Test Plan Generator runs - it has no evidence to consume, same failure mode as `playwright-browser-exploration`'s total-exploration-failure case.
- Spec reachable but incomplete for one operation (e.g. no documented error responses): proceed, flag the specific gap in `api-exploration.md` rather than blocking the whole artifact.

## Retry Strategy

- Retry transient network/fetch failures (timeouts, 5xx) up to 3 times with backoff.
- Do not retry a confirmed-absent spec (404) or a permanent auth failure - surface immediately.

## Logging

- Log: operations captured, source per operation (Swagger doc / requirements.md / reused-from-index), assumptions made, and any live-verification calls issued (method + target, never payload contents if it may contain secrets).

## What This Skill Must NOT Do

- Must NOT generate client code or test specs - that is `api-client-generator`'s and `api-test-script-generator`'s job.
- Must NOT re-analyze an operation `api-capability-discovery` already resolved as `FULL_REUSE`.
- Must NOT fabricate example payloads, status codes, or schema fields not present in the source evidence.
- Must NOT issue write calls against a live API for exploration purposes.

## Future Extensions

- GraphQL schema introspection.
- SOAP WSDL parsing.
- Contract-drift detection - diff a live spec against the last-captured `api-exploration.md`.
