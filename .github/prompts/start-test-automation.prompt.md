---
description: "General entry point for the test automation platform. Accepts a Jira ID, Epic ID, Swagger/OpenAPI spec, application URL, failing test report, ADO build, or plain-language request, and routes it to the correct specialist agent via the Unified Test Orchestrator."
agent: unified-test-orchestrator
argument-hint: "Jira ID, Epic ID, Swagger/OpenAPI URL, application URL, failing test description, ADO build, or plain-language request"
---
Understand the request below using the Unified Test Orchestrator workflow: classify the input, determine intent, determine project type and framework, then delegate to the correct specialist agent (UI Test Generator, API Test Generator, Unified Test Healer, ADO Analyzer, or Epic To User Stories).

Ask clarifying questions if the request is ambiguous instead of guessing.

Request:
