# API Capability Discovery

## Purpose

The API equivalent of the UI reuse layer (`.github/capabilities/`): **before Swagger/OpenAPI analysis or live API exploration, search the existing API automation framework** for reusable clients, methods, request/payload builders, and validators. Same principle, same three-way decision shape - just pointed at API clients instead of UI Page Objects. Index files are hand-authored (or AI-assisted), under `index/<clients|api|services>/`, mirroring the client class they describe - see Index Authorship below - which is what makes this Skill work for any language (Java/RestAssured, JS/Supertest, Python, ...), not just JavaScript.

## Repository State At The Time This Was Built

**This repository currently has no API automation of any kind.** Verified before writing anything: no `axios`/`supertest`/`rest-assured` dependency in `package.json`, no `api/`/`clients/`/`services/` directory, no `*ApiClient`/`*Client`/`*Api` source file anywhere, no API-specific instructions file, `framework-profile.json` already reports `apiFramework: "unknown"` and `architecture.api: "unknown"`.

This Skill is therefore built to work correctly *the moment* a developer adds a real API client - it is not built around, and does not pretend to have found, capabilities that don't exist. With zero index files present under `index/`, `ApiIndexSearch` correctly loads zero classes and every scenario falls through to `NO_REUSE`, not a fabricated match.

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
          API Contract Analyzer / API Client Generator / API Test Script Generator
          (see api-contract-analyzer/README.md, api-client-generator/README.md,
           api-test-script-generator/README.md - each scoped by the decision above
           rather than always running in full)
```

Runs once per request, inside `api-automation-specialist` (see [api-automation-specialist.agent.md](../../agents/api-automation-specialist.agent.md)), reusing Test Architect and Test Validator exactly as built for UI - **not duplicated**.

## Inputs

- `artifacts/<slug>/test-design.json` (primary - each scenario's `steps` become the required operations to search for; scenarios with `technology: "API"` or `"both"` are in scope, `"UI"`-only scenarios are not)
- `index/<clients|api|services>/*.json` (the index this Skill searches - mirroring whichever of those three directories the target repository uses for its API client classes)
- `artifacts/<slug>/requirements.md`, for any explicit endpoint/HTTP-method evidence not captured in `test-design.json`

## Outputs

- `artifacts/<slug>/api-reuse-decision.json` - per-scenario `FULL_REUSE`/`PARTIAL_REUSE`/`NO_REUSE` with evidence, in the same `artifacts/<slug>/` directory as every other pipeline artifact.

This Skill only reads the index - it never writes or updates index files itself; that is `api-client-generator`'s job when it creates a class, or a manual/AI-assisted edit when retrofitting existing code (see Index Authorship below).

## API Index (`index/<clients|api|services>/` files)

Same shape decision as the UI class index - no business-capability abstraction, no `capabilities/login.json`/`create.json`/`search.json` files. One JSON file per actual API client class, mirroring the source tree under `index/`:

```
clients/                          (or api/, or services/ - whichever the project uses)
├── CustomerApiClient.java
└── OrderApiClient.js

index/clients/                    (mirrors the tree above)
├── CustomerApiClient.json
└── OrderApiClient.json
```

Each index file: `className`, `file` (source path), `methods[]` - each with `name`, `params`, `description`, `httpMethod` (GET/POST/PUT/PATCH/DELETE, when known), `endpoint` (the literal path, when known). No inferred business capability is ever added - see the example below.

**Worked example** (from your prompt, showing what the index would capture *if* this class existed - it does not exist in this repository today):

```java
// CustomerApi.java (hypothetical - not present in this repo)
getCustomer(String customerId)
createCustomer(CustomerRequest request)
```
→ `index/clients/CustomerApi.json`, mirroring `clients/CustomerApi.java`, would record exactly those two methods and their parameters - never a derived `customer-management.json` or `search.json`.

### Index Authorship

No generator script, no parser, nothing to run. An index file is written by hand (or with AI assistance) in the same change that creates or modifies its client class - the same discipline as updating a test alongside the code it covers. This is a deliberate simplification: an earlier version of this Skill mechanically parsed source to build the index, but that parser only ever understood JavaScript (see `git log` for that history if needed) - it could never support a RestAssured/Java-only project, which is the exact case this scaffold needs to serve. Manual/AI authorship works identically regardless of source language, at the cost of the index being able to drift from source if a change forgets to update it - see Index Accuracy in [02.5_intelligent-reuse-enforcement.hook.md](../../hooks/02.5_intelligent-reuse-enforcement.hook.md).

### Search & Decision (`search.js`)

`ApiIndexSearch` - `searchClasses(query)`, `searchMethods(query)`, and the decision function:

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

- Must NOT launch Playwright MCP, open a browser, take a screenshot, or perform live API exploration itself - it only decides whether those are needed next; the actual exploration stays `api-contract-analyzer`'s job (see [api-contract-analyzer/README.md](../api-contract-analyzer/README.md)).
- Must NOT fetch a Swagger/OpenAPI document merely because a URL for one exists, when the existing implementation already fully satisfies the requirement.
- Must NOT create a business-capability abstraction layer (`capabilities/login.json`, `capabilities/create.json`, etc.) - one file per real client class only, exactly like the UI class index.
- Must NOT duplicate Test Architect or Test Validator - both are invoked as-is; this Skill only adds the reuse-decision step between them and generation.
- Must NOT claim reuse from method-name similarity alone - see No False Positives.
- Must NOT write or modify index files itself - it is a read-only consumer of the index (see Index Authorship above).

## Git / Artifacts

Index files live next to the client classes they describe (`clients/`, `api/`, or `services/`), tracked in git exactly like the source itself - no separate `artifacts/indexes/` location or `.gitignore` exception needed for them.

## Integration With The API Agent

See [api-automation-specialist.agent.md](../../agents/api-automation-specialist.agent.md) for the exact pipeline position. Summary: Jira Story Analyzer → **Test Architect** (reused) → **Test Validator** (reused, gate - `BLOCKED` stops here, before this Skill even runs) → **API Capability Discovery** → conditional **API Contract Analyzer** → Test Plan Generator / Test Case Documenter (reused, shared with UI) → **API Client Generator** / **API Test Script Generator**.

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

- The index can drift from source: nothing detects a renamed/removed method whose index file wasn't updated in the same change. This is the deliberate trade-off of manual/AI authorship over a mechanical parser - see Index Authorship above.
- Confidence scoring is keyword/verb-family based, not a full NLP match - a genuinely reusable method with very different wording from the requirement may score below the confidence bar and be missed.
