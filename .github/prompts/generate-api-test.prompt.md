---
description: "Generate manual test cases and API automation from a Swagger/OpenAPI specification, Jira story, or endpoint description, using the API Automation Specialist agent's pipeline."
agent: api-automation-specialist
argument-hint: "Swagger/OpenAPI URL or file, Jira Story ID, or REST/GraphQL/SOAP endpoint description"
---
Generate manual test cases and API automation for the specification provided below, following the API Automation Specialist agent's pipeline: requirements, test design, test design validation, API capability discovery, API contract analysis, test plan, manual test cases, clients, then automation.

- Reuse existing API clients, fixtures, and framework conventions in the target repository before creating new ones.
- Do not proceed past a Test Validator `status: BLOCKED` result.

Specification:
