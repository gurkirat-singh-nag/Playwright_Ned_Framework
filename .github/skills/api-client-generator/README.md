# API Client Generator

## Purpose

The API equivalent of `page-object-generator`: generate reusable API client classes from `api-exploration.md`'s contract evidence and the operations required by `testcases.json`. Framework-agnostic: the client library used is whatever `artifacts/indexes/framework-profile.json` reports as `apiFramework`, never assumed.

## Inputs

- `artifacts/<slug>/api-exploration.md`
- `artifacts/<slug>/testcases.json`
- `artifacts/indexes/framework-profile.json` (`apiFramework`, `architecture.api`)
- `index/<clients|api|services>/*.json` (existing client index, via `api-capability-discovery`'s search)

## Outputs

- `clients/` (or the target repository's existing API client directory - `api/`, `clients/`, or `services/`, whichever `architecture.api` / the existing index already uses; create `clients/` only when none of these exist yet)
- `index/<clients|api|services>/<className>.json` mirroring each client class this Skill creates or modifies

## Artifacts Consumed

- `api-exploration.md` and `testcases.json` only. This Skill must never contact Jira, Confluence, or a live API directly - if a required schema detail is missing from `api-exploration.md`, it is flagged, not re-explored ad hoc.

## Execution Steps

1. Read `testcases.json` to determine every distinct API operation (method + endpoint) required.
2. For each operation, check the `index/<clients|api|services>/*.json` files (via `api-capability-discovery`'s `ApiIndexSearch`) for an existing client method that already covers it; if found, reuse it - never generate a duplicate.
3. **Select the client style** from `framework-profile.json.apiFramework`:
   - `Supertest` / `Axios (unstructured)` / `RestAssured` (or any other real value the profile reports): follow that library's existing idioms as already used in the target repository, matching whatever pattern the existing client index shows.
   - `unknown` (no API client exists yet in the target repository): default to Node's built-in `fetch` (available without adding a dependency) rather than introducing a new library unprompted. Record this as an explicit assumption in the generated file's header comment and in this Skill's log output - swapping to a team-preferred library is then a deliberate follow-up decision, not something this Skill decided silently.
4. For each operation without existing coverage, generate a client method using `api-exploration.md`'s recorded path, HTTP method, request/response schema, and authentication requirement.
5. Follow [api-client.instructions.md](../../instructions/api-client.instructions.md) for naming/structure conventions.
6. Update each test case's `requiredApiClients` field in `testcases.json` to reflect the client method(s) it depends on (same pattern as `requiredPageObjects`).
7. Write the client file(s), and write or update the matching `index/<clients|api|services>/<className>.json` for each one - see [api-client.instructions.md](../../instructions/api-client.instructions.md). This Skill already knows exactly which methods it just wrote, so authoring the index entry here costs nothing extra and needs no source parsing.

## Failure Handling

- `api-exploration.md` or `testcases.json` missing: stop the pipeline and report the missing upstream artifact.
- A required schema field is missing or unconfirmed in `api-exploration.md`: generate the method with an explicit `// TODO: undocumented - verify against real endpoint` comment rather than fabricating the field; do not block the entire Skill unless every operation is affected.

## Retry Strategy

- Retry only transient file read/write errors (up to 3 attempts). Documentation gaps are not retried - they are reported.

## Logging

- Log: clients generated vs. reused, the `apiFramework` selected (and whether it was an assumed default), and any schema gaps flagged.

## Future Extensions

- Multi-language client output (Java/RestAssured, Python/requests) when a target repository's `framework-profile.json` reports a non-JS stack.
- Auth-token refresh/session helper generation shared across clients.
