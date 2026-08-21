# API Capability Discovery

## Purpose

The API equivalent of the UI reuse layer built in Prompt 1 (`.github/capabilities/`): **before Swagger/OpenAPI analysis or live API exploration, search the existing API automation framework** for reusable clients, methods, request/payload builders, and validators. Same principle, same "index is generated metadata, never the source of truth" contract, same three-way decision shape - just pointed at API clients instead of UI Page Objects.

## Repository State At The Time This Was Built

**This repository currently has no API automation of any kind.** Verified before writing anything: no `axios`/`supertest`/`rest-assured` dependency in `package.json`, no `api/`/`clients/`/`services/` directory, no `*ApiClient`/`*Client`/`*Api` source file anywhere, no API-specific instructions file, `framework-profile.json` already reports `apiFramework: "unknown"` and `architecture.api: "unknown"`.

This Skill is therefore built to work correctly *the moment* a developer adds a real API client - it is not built around, and does not pretend to have found, capabilities that don't exist. Running `generator.js` today correctly produces an empty `artifacts/indexes/api/_manifest.json` with an explicit `note` field saying so, not a fabricated example.

## Position In The Pipeline

```
Test Architect  →  test-design.json
        ↓
Test Validator  →  test-validation.json   [GATE]
        ↓ (only if not BLOCKED)
API CAPABILITY DISCOVERY  →  api-reuse-decision.json
        ↓
   ┌─────────────┬──────────────┬─────────────┐
   │             │              │             │
FULL_REUSE   PARTIAL_REUSE   NO_REUSE
   │             │              │             │
   ▼             ▼              ▼             │
Generate    Discover only   Swagger/OpenAPI   │
from        the missing     analysis or       │
existing    operation(s)    live API          │
   │             │           discovery        │
   └─────────────┴──────────────┴─────────────┘
                  ↓
          API Contract Analysis / Client Generation / Test Script Generation
          (existing test-generator-api Skills - still not yet implemented,
           now scoped by the decision above rather than always running in full)
```

Runs once per request, inside `test-generator-api` (see [test-generator-api.agent.md](../../agents/test-generator-api.agent.md)), reusing Test Architect and Test Validator exactly as built for UI - **not duplicated**. `test-generator-api` did not previously invoke either Skill at all (it predates them); this task wires it in for the first time.

## Inputs

- `artifacts/<slug>/test-design.json` (primary - each scenario's `steps` become the required operations to search for; scenarios with `technology: "API"` or `"both"` are in scope, `"UI"`-only scenarios are not)
- `artifacts/indexes/api/*.json` and `_manifest.json` (the index this Skill searches)
- `artifacts/<slug>/requirements.md`, for any explicit endpoint/HTTP-method evidence not captured in `test-design.json`

## Outputs

- `artifacts/<slug>/api-reuse-decision.json` - per-scenario `FULL_REUSE`/`PARTIAL_REUSE`/`NO_REUSE` with evidence, in the same `artifacts/<slug>/` directory as every other pipeline artifact.
- `artifacts/indexes/api/*.json` + `_manifest.json` - regenerated if stale, same lifecycle as the UI class index.

## API Index (`artifacts/indexes/api/`)

Exactly the same shape decision as the UI class index - no business-capability abstraction, no `capabilities/login.json`/`create.json`/`search.json` files. One JSON file per actual API client class:

```
artifacts/indexes/api/
├── _manifest.json
└── <ClassName>.json        (one per real API client class found in source)
```

Each class file: `className`, `file` (source path), `methods[]` - each with `name`, `params`, `async`, `description` (from JSDoc when present, else derived from the name), `httpMethod` (GET/POST/PUT/PATCH/DELETE, extracted from the method body when determinable, else `null`), `endpoint` (extracted literal path/URL when determinable, else `null`), `authenticationHint` (a matched keyword like "Authorization"/"Bearer" when present in the method body, else `null`). No inferred business capability is ever added - see the example below.

**Worked example** (from your prompt, showing what the index would capture *if* this class existed - it does not exist in this repository today):

```java
// CustomerApi.java (hypothetical - not present in this repo)
getCustomer(String customerId)
createCustomer(CustomerRequest request)
```
→ `artifacts/indexes/api/CustomerApi.json` would record exactly those two methods, their parameters, and (if determinable from the body) HTTP verb/endpoint - never a derived `customer-management.json` or `search.json`.

### Generation (`generator.js`)

Deterministic, mirrors [.github/capabilities/generator.js](../../capabilities/generator.js)'s brace-depth method-parsing technique exactly (reused, not reimplemented differently). Scans `api/`, `clients/`, `services/` (the same target-type search strategy already documented, but never implemented, in [04_duplicate-detection.hook.md](../../hooks/04_duplicate-detection.hook.md)'s "api-client" search) plus root-level `*ApiClient.js`/`*Client.js`/`*Api.js` files. Regenerating always reflects current source - a removed method disappears from the index on the next run; nothing accumulates.

```bash
node .github/skills/api-capability-discovery/generator.js            # regenerate
node .github/skills/api-capability-discovery/generator.js --summary   # report only, no write
```

Currently parses JavaScript only (this repository is JavaScript-only per `framework-profile.json` - RestAssured/Java parsing was deliberately not built without evidence it's needed here; see Limitations).

### Search & Decision (`search.js`)

`ApiIndexSearch` - `searchClasses(query)`, `searchMethods(query)`, `verifyMethodsInSource(className, methods)`, and the decision function:

```javascript
const { ApiIndexSearch } = require('./.github/skills/api-capability-discovery/search.js');
const searcher = new ApiIndexSearch();

const result = searcher.analyzeReuseCoverage([
  { description: 'Retrieve customer details using customer ID' }
  // optionally: { description: '...', httpMethod: 'GET', endpoint: '/customers' }
]);
// { decision: 'FULL_REUSE' | 'PARTIAL_REUSE' | 'NO_REUSE', coverage: 0-100,
//   existingImplementation: [{ class, method, confidence, operation }], missing: [...] }
```

## No False Positives

A method name/description overlap alone is not sufficient - `getCustomer()` must not satisfy a `searchCustomerByAccountNumber()` requirement just because "customer" overlaps. Two safeguards, both real code, not aspirational:

1. **Action-verb family check**: each query and each candidate method is classified into an operation family (`get`/`search`/`create`/`update`/`delete`, each with a small synonym set - e.g. "retrieve" and "get" are the same family, "search"/"find"/"list" are a different one). Same family is a *positive* signal (+30, rewarding "retrieve" matching "get" even though the literal words differ); different family is a strong *penalty* (score × 0.3). Verified: a `getCustomer()`/`createCustomer()` client returns `NO_REUSE` (not a false match) for `"Search customer by account number"`.
2. **Explicit evidence override**: when the requirement states a concrete `httpMethod`/`endpoint`, a candidate must actually match that HTTP method/path - a name-only match against stated concrete evidence is not credited.

Confidence bar for `FULL_REUSE`/`PARTIAL_REUSE` is 75 (vs. 60 for the UI class index) - a wrong API reuse match is costlier than a wrong UI locator guess.

## FULL / PARTIAL / NO REUSE Logic

- **`FULL_REUSE`** (coverage = 100%): every required operation for the scenario matched an existing method with confidence ≥75. Skip Swagger/API exploration entirely for this scenario; generate directly from the existing method(s).
- **`PARTIAL_REUSE`** (0% < coverage < 100%): some operations matched, others didn't. Downstream discovery investigates **only** the `missing[]` operations - it must not re-explore what already matched (e.g. `createCustomer()` reused as-is; only `duplicateCustomerValidation()`-shaped behavior gets explored).
- **`NO_REUSE`** (coverage = 0%): nothing matched. The pipeline may proceed to Swagger/OpenAPI analysis or live API discovery - this Skill does not perform that exploration itself, it only clears the way for it.

## Swagger / Live API Exploration Conditions

- **Never the first action.** This Skill always runs first; Swagger/live API exploration is conditional on its decision, never a default starting point.
- Swagger/OpenAPI analysis and live API calls run **only** for `NO_REUSE` scenarios in full, or the specific `missing[]` operations of a `PARTIAL_REUSE` scenario - never for a scenario this Skill already resolved as `FULL_REUSE`.
- A Swagger URL existing in `requirements.md` is not itself a reason to fetch it - if the existing implementation already fully satisfies the requirement (`FULL_REUSE`), the Swagger document is not fetched at all.

## What This Skill Must NOT Do

- Must NOT launch Playwright MCP, open a browser, take a screenshot, or perform live API exploration itself - it only decides whether those are needed next; the actual exploration stays the API contract-analysis Skill's job (still not yet implemented in this repo - see `test-generator-api.agent.md`).
- Must NOT fetch a Swagger/OpenAPI document merely because a URL for one exists, when the existing implementation already fully satisfies the requirement.
- Must NOT create a business-capability abstraction layer (`capabilities/login.json`, `capabilities/create.json`, etc.) - one file per real source class only, exactly like the UI class index.
- Must NOT duplicate Test Architect or Test Validator - both are invoked as-is; this Skill only adds the reuse-decision step between them and generation.
- Must NOT claim reuse from method-name similarity alone - see No False Positives.
- Must NOT build an append-only index - `generator.js` rebuilds the whole `artifacts/indexes/api/` directory from current source on every run, exactly like the UI generator.

## Index Synchronization

Identical contract to the UI class index: the index is generated metadata, never the source of truth. A method added to a real API client appears on the next `generator.js` run; a method removed or a change reverted disappears on the next run - nothing is retained once its source is gone.

## Git / Artifacts

`artifacts/indexes/` (including the new `api/` subdirectory) is already excepted from the `artifacts/*` ignore rule fixed in an earlier prompt - `.gitignore` was not modified for this task; the existing exception already covers it structurally (`!artifacts/indexes/` un-ignores the whole `indexes/` tree, and nothing re-excludes `api/` the way `indexes/capabilities/` is deliberately re-excluded). Verified via `git check-ignore`, not assumed.

## Integration With The API Agent

See [test-generator-api.agent.md](../../agents/test-generator-api.agent.md) for the exact pipeline position. Summary: Jira Story Analyzer → **Test Architect** (reused) → **Test Validator** (reused, gate - `BLOCKED` stops here, before this Skill even runs) → **API Capability Discovery** → conditional API Contract Analysis (existing stub, now scoped) → Test Plan Generator / Test Case Documenter (existing, shared with UI) → API Client Generation / API Test Script Generation (existing stubs, still not yet implemented - unchanged by this task).

## MCP / HTTP Calls

**Zero**, by design. Repository search and index lookup only. HTTP/web fetch for a Swagger/OpenAPI document is the *next* stage's concern, gated by this Skill's decision, never performed by this Skill itself.

## Logging

```
[API Capability Discovery] Scenario SC-002: decision=FULL_REUSE, coverage=100%
[API Capability Discovery]   Reusing: CustomerApiClient.getCustomer() (confidence 92)
[API Capability Discovery] Scenario SC-005: decision=PARTIAL_REUSE, coverage=50%
[API Capability Discovery]   Reusing: CustomerApiClient.createCustomer() (confidence 100)
[API Capability Discovery]   Missing: duplicate customer handling - scoping API discovery to this only
[API Capability Discovery] ✓ api-reuse-decision.json written
```

## Limitations

- Parses JavaScript source only - no Java/RestAssured, C#, or Python parsing was built, because no evidence in this repository calls for it (see "Repository State" above). Extending `generator.js` to another language is future work if/when this repository (or another using this scaffold) actually has such source to index.
- HTTP-method/endpoint extraction is a body-text regex heuristic (`.get('/path')` style calls) - it will miss endpoints built from string concatenation/template interpolation or configured outside the method body (e.g. a shared base client). Falls back to `null`, never a guessed value.
- Confidence scoring is still keyword/verb-family based, not a full NLP match - the same class of limitation already disclosed for the UI class index in Prompt 1.
