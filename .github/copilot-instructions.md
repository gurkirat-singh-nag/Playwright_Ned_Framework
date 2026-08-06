# Copilot Instructions - Test Automation Platform

## Repository Architecture

This repository is an orchestration scaffold for an AI-powered test automation platform. It defines Agents, Skills, Instructions, and Prompts. It is not itself a runnable product or test project.

```
.github/
├── agents/         # Orchestrators and specialist agents - coordinate Skills, no business logic
├── skills/         # Reusable, single-responsibility workflow units
├── instructions/   # Coding and naming conventions, auto-attached or on-demand
├── prompts/        # Parameterized entry points into Agents
└── workflows/      # Reserved for CI/automation workflows
```

## Artifact Pipeline

```
Jira Story
  ↓
requirements.md                  (jira-story-analyzer)
  ↓
exploration.md                   (playwright-browser-exploration)
  ↓
test-plan.md                     (test-plan-generator)
  ↓
test-cases.md / testcases.json   (test-case-documenter)
  ↓
pageobjects/                     (page-object-generator)
  ↓
tests/                           (test-script-generator)
```

Every artifact is written under `artifacts/<slug>/` - see [naming.instructions.md](instructions/naming.instructions.md). No artifact is skipped, and no artifact is regenerated once it exists and remains valid.

## Design Principles

- Single Responsibility - each Agent or Skill does exactly one job.
- Pipeline Architecture - artifacts flow strictly forward, phase by phase.
- Artifact-Driven Workflow - every phase consumes the previous phase's artifact and produces its own.
- Reusable Skills - Skills are shared across Agents; no duplicated logic between them.
- Thin Agents - Agents orchestrate and delegate; they never contain business logic or generation logic themselves.
- Extensible - new frameworks or protocols (Selenium, Cypress, Appium, REST, GraphQL, SOAP, Kafka) are added via new specialist Agents and Skills, without modifying the orchestrator's core routing logic.
- Enterprise Ready - every generated artifact follows the coding, naming, and traceability standards below.

## Agent Responsibilities

| Agent | Responsibility |
|---|---|
| [unified-test-orchestrator](agents/unified-test-orchestrator.agent.md) | Understand requests and route to the correct specialist agent. Never generates tests. |
| [test-generator-ui](agents/test-generator-ui.agent.md) | Coordinate the UI artifact pipeline via its six Skills. |
| [test-generator-api](agents/test-generator-api.agent.md) | Coordinate the API artifact pipeline via reusable and future API Skills. |
| [unified-test-healer](agents/unified-test-healer.agent.md) | Diagnose and apply the smallest safe fix to failing automation. |
| [jenkins-analyzer](agents/jenkins-analyzer.agent.md) | Investigate Jenkins builds and categorize failures. |
| [epic-to-user-stories](agents/epic-to-user-stories.agent.md) | Decompose a Jira Epic into candidate user stories. |

## Skill Responsibilities

| Skill | Responsibility |
|---|---|
| [jira-story-analyzer](skills/jira-story-analyzer/README.md) | Jira/Confluence → `requirements.md`. |
| [playwright-browser-exploration](skills/playwright-browser-exploration/README.md) | `requirements.md` → `exploration.md` via Playwright MCP. |
| [test-plan-generator](skills/test-plan-generator/README.md) | `requirements.md` + `exploration.md` → `test-plan.md`. |
| [test-case-documenter](skills/test-case-documenter/README.md) | `test-plan.md` → `test-cases.md` + `testcases.json`. |
| [page-object-generator](skills/page-object-generator/README.md) | `exploration.md` + `testcases.json` → `pageobjects/`. |
| [test-script-generator](skills/test-script-generator/README.md) | `pageobjects/` + `testcases.json` → `tests/`. |

## Coding Standards

See [coding-standards.instructions.md](instructions/coding-standards.instructions.md) for enterprise coding conventions, [naming.instructions.md](instructions/naming.instructions.md) for naming conventions, and [playwright.instructions.md](instructions/playwright.instructions.md) for Playwright-specific conventions.

## Future Extensibility

- UI frameworks: Selenium, Cypress, Appium.
- API protocols: REST, GraphQL, SOAP.
- Messaging: Kafka.
- Each is added as a new specialist agent plus its own Skills, following the same thin-agent, artifact-driven pattern already established for UI and API.