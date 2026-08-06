---
description: "Generate manual test cases and API automation from a Swagger/OpenAPI specification, Jira story, or endpoint description, using the API Test Generator agent's pipeline."
agent: test-generator-api
argument-hint: "Swagger/OpenAPI URL or file, Jira Story ID, or REST/GraphQL/SOAP endpoint description"
---
Generate manual test cases and, where the required Skills exist, API automation for the specification provided below, following the API Test Generator agent's pipeline: requirements, API contract analysis, test plan, manual test cases, clients, then automation.

- If a required Skill (API contract analysis, client generation, or script generation) is not yet implemented in this repository, state that explicitly and stop at the last available artifact instead of fabricating the missing stage.
- Reuse existing API clients, fixtures, and framework conventions in the target repository before creating new ones.

Specification:
