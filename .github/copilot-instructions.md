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
test-design.md / test-design.json (test-architect - technology-neutral, traceable to acceptance criteria)
  ↓
test-validation.md / test-validation.json (test-validator - GATE: BLOCKED stops here)
  ↓
reuse-decision.json              (02.5_intelligent-reuse-enforcement.hook.md - capability discovery)
  ↓
exploration.md                   (playwright-browser-exploration - scoped by the reuse decision)
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
| [central-automation-orchestrator](agents/central-automation-orchestrator.agent.md) | Understand requests and route to the correct specialist agent. Never generates tests. |
| [test-generator-ui](agents/test-generator-ui.agent.md) | Coordinate the UI artifact pipeline via its eight Skills. |
| [test-generator-api](agents/test-generator-api.agent.md) | Coordinate the API artifact pipeline: shares `test-architect`/`test-validator`/`test-plan-generator`/`test-case-documenter` with the UI pipeline, adds `api-capability-discovery`, `api-contract-analyzer`, `api-client-generator`, `api-test-script-generator`. |
| [unified-test-healer](agents/unified-test-healer.agent.md) | Diagnose and apply the smallest safe fix to failing automation. |
| [ado-analyzer](agents/ado-analyzer.agent.md) | Investigate Azure DevOps (ADO) pipeline builds and categorize failures. |
| [epic-to-user-stories](agents/epic-to-user-stories.agent.md) | Decompose a Jira Epic into candidate user stories. |

## Skill Responsibilities

| Skill | Responsibility |
|---|---|
| [framework-discovery](skills/framework-discovery/README.md) | Repository → `artifacts/indexes/framework-profile.json` (language, UI/API framework, test runner, architecture, directories, reporting, CI, MCP). Code/repository discovery only - never launches a browser or MCP session. Invoked once per request by `central-automation-orchestrator`, before UI/API path selection. |
| [jira-story-analyzer](skills/jira-story-analyzer/README.md) | Jira/Confluence → `requirements.md`. |
| [test-architect](skills/test-architect/README.md) | `requirements.md` + `framework-profile.json` → `test-design.md`/`test-design.json`: technology-neutral scenarios traceable to acceptance criteria, automation/manual classification, test data, risks. Reasoning/design only - no automation code, no MCP, no deep capability matching. Runs once per request, before Test Validator. |
| [test-validator](skills/test-validator/README.md) | `test-design.json` → `test-validation.md`/`test-validation.json`: **GATE**. Validates completeness, traceability, internal consistency, duplication, automation feasibility, technology consistency, and artifact integrity (BLOCKED stops the pipeline before capability discovery/generation). No automation code, no MCP, no deep capability matching. Shared by both `test-generator-ui` and `test-generator-api` - not duplicated per project type. |
| [api-capability-discovery](skills/api-capability-discovery/README.md) | `test-design.json` (API/both-scoped scenarios) → `api-reuse-decision.json`: searches `artifacts/indexes/api/` for existing API clients/methods, decides FULL_REUSE/PARTIAL_REUSE/NO_REUSE per scenario. No Swagger fetch, no live API call, no MCP - only clears the way for conditional Swagger/API exploration next. API equivalent of the UI reuse-enforcement hook. |
| [api-contract-analyzer](skills/api-contract-analyzer/README.md) | `requirements.md` + `api-reuse-decision.json` → `api-exploration.md`: Swagger/OpenAPI parsing or requirements-text contract extraction, scoped by the reuse decision. API equivalent of `playwright-browser-exploration`. |
| [api-client-generator](skills/api-client-generator/README.md) | `api-exploration.md` + `testcases.json` + `framework-profile.json` (`apiFramework`) → `clients/`: generates/reuses API client classes. API equivalent of `page-object-generator`. |
| [api-test-script-generator](skills/api-test-script-generator/README.md) | `clients/` + `testcases.json` → `tests/` (`<Feature>ApiTest.spec.js`): generates executable API test specs. API equivalent of `test-script-generator`. |
| [pipeline-state](skills/pipeline-state/README.md) | Shared checkpoint/resume utility (not an artifact-producing Skill) - `artifacts/<slug>/pipeline-state.json` records which of 10 pipeline stages are NOT_STARTED/IN_PROGRESS/COMPLETED/FAILED/SKIPPED/BLOCKED, so a restarted pipeline resumes at the last valid checkpoint instead of repeating expensive work (especially MCP exploration). A stage is COMPLETED only when its output artifact actually validates - re-checked on every resume, never blindly trusted. |
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