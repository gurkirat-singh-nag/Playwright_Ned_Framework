---
description: "Use when generating or editing API client classes for API automation. Covers client naming, structure, and framework-selection strategy."
applyTo: "**/clients/**, **/api/**, **/services/**"
---

# API Client Conventions

Framework-agnostic by design: the HTTP client library follows whatever `artifacts/indexes/framework-profile.json` reports as `apiFramework` for the target repository - never assumed. See [api-client-generator/README.md](../skills/api-client-generator/README.md) Step 3 for the exact selection rule (existing library if one is already in use; Node's built-in `fetch` as the zero-dependency default when none exists yet, recorded as an explicit assumption).

- One class per resource/service, in the project's existing API client directory (`clients/`, `api/`, or `services/` - reuse whichever already exists; create `clients/` only if none does).
- Naming: `camelCase` class name suffixed with `Client` (e.g. `userClient`, `customerClient`), mirroring the Page Object naming convention (`camelCase` + `Page`) already used in this repository. File name matches the class name exactly (e.g. `userClient.js`).
- Export with `module.exports = { <className> };` and import with `const { <className> } = require('../clients/<className>');`, matching the CommonJS convention already used by Page Objects.
- Each method represents one API operation (`getCustomer(customerId)`, `createCustomer(payload)`), named after the operation, not the raw HTTP verb - callers should not need to know the underlying request-library call.
- Base URL, default headers, and authentication (e.g. bearer token attachment) belong in the constructor or a shared base client, not repeated per method.
- API clients must not contain test assertions (`expect`). Return the response (status, body, headers) for the test spec to assert on.
- Do not couple a client to a specific test case; it must be reusable across every test case that calls that operation.
- Reuse a shared base client for cross-cutting concerns (auth header attachment, base URL, retry/backoff) already present in the target project, instead of duplicating them per client class.
