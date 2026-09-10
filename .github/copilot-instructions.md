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
Jira Story (or direct story text / a supplied manual test case)
  ↓
test-plan.md                     (test-plan-generator, or input-normalizer for manual-test-case -
                                   technology-neutral test plan, traceable to acceptance criteria;
                                   the former Test Architect/Test Validator design+validation
                                   judgment now happens inline here, before the file is written -
                                   a blocking problem stops the pipeline here, reported, not persisted
                                   as a separate artifact)
  ↓
Existing Automation / Index      (02.5_intelligent-reuse-enforcement.hook.md - read-only search
                                   against index/page-objects/*.json; decision passed directly,
                                   in-memory, to exploration - never persisted to a reuse-decision file)
  ↓
exploration.md                   (playwright-browser-exploration - scoped by the reuse decision;
                                   only explores what existing automation doesn't already cover)
  ↓
test-cases.md / testcases.json   (test-case-documenter)
  ↓
pageobjects/                     (page-object-generator - never writes to index/page-objects/)
  ↓
tests/                           (test-script-generator)
```

Exactly three story artifacts exist under `artifacts/<slug>/`: `test-plan.md`, `exploration.md`, `test-cases.md` (plus its machine-readable companion `testcases.json`) - see [naming.instructions.md](instructions/naming.instructions.md). `requirements.md`, `test-design.md`/`.json`, `test-validation.md`/`.json`, and `reuse-decision.json` are retired. `pipeline-state.json` (checkpoint/resume state) also lives under `artifacts/<slug>/` but is internal plumbing, not a story artifact. No artifact is skipped, and no artifact is regenerated once it exists and remains valid.

The `index/page-objects/*.json` (and API equivalent `index/<clients|api|services>/*.json`) class index is **entirely developer-maintained**. No Agent or Skill in this pipeline ever creates, updates, regenerates, or validates it - Qatalyst only ever reads it.

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
| [ui-automation-specialist](agents/ui-automation-specialist.agent.md) | Coordinate the UI artifact pipeline via its Skills. |
| [api-automation-specialist](agents/api-automation-specialist.agent.md) | Coordinate the API artifact pipeline: shares `test-plan-generator`/`test-case-documenter` with the UI pipeline, adds `api-capability-discovery`, `api-contract-analyzer`, `api-client-generator`, `api-test-script-generator`. |
| [automation-healer-specialist](agents/automation-healer-specialist.agent.md) | Diagnose and apply the smallest safe fix to failing automation. |
| [ci-analyzer-specialist](agents/ci-analyzer-specialist.agent.md) | Investigate Azure DevOps (ADO) pipeline builds and categorize failures. |
| [epic-to-user-stories](agents/epic-to-user-stories.agent.md) | Decompose a Jira Epic into candidate user stories. |

## Skill Responsibilities

| Skill | Responsibility |
|---|---|
| [framework-discovery](skills/framework-discovery/README.md) | Repository → `index/framework-profile.json` (language, UI/API framework, test runner, architecture, directories, reporting, CI, MCP). Code/repository discovery only - never launches a browser or MCP session. Invoked once per request by `central-automation-orchestrator`, before UI/API path selection. |
| [jira-story-analyzer](skills/jira-story-analyzer/README.md) | Jira/Confluence → structured story content, handed directly to `test-plan-generator` in-memory. No `requirements.md` is written. |
| [input-normalizer](skills/input-normalizer/README.md) | Non-Jira input → the same structured content (`direct-story-text`, passed through in-memory) or `test-plan.md` directly (`manual-test-case`, a single fully-specified scenario needing no design step). |
| [test-plan-generator](skills/test-plan-generator/README.md) | Story content + `framework-profile.json` → `test-plan.md`: technology-neutral scenarios traceable to acceptance criteria, automation/manual classification, test data, risks - merging the former Test Architect + Test Validator steps into one. Its own internal quality gate (completeness, traceability, duplication, feasibility, technology consistency) is applied inline before the file is written; a blocking problem stops the pipeline and is reported, never persisted as a separate `test-validation` artifact. No automation code, no MCP, no deep capability matching. Shared by both `ui-automation-specialist` and `api-automation-specialist` - not duplicated per project type. |
| [api-capability-discovery](skills/api-capability-discovery/README.md) | `test-plan.md` (API/both-scoped scenarios) → an in-memory reuse decision, handed directly to `api-contract-analyzer`: searches `index/<clients|api|services>/*.json` files mirroring each client class for existing API clients/methods, decides FULL_REUSE/PARTIAL_REUSE/NO_REUSE per scenario. No Swagger fetch, no live API call, no MCP, and no persisted `api-reuse-decision.json` file. API equivalent of the UI reuse-enforcement hook. |
| [api-contract-analyzer](skills/api-contract-analyzer/README.md) | `test-plan.md` + the in-memory API reuse decision → `api-exploration.md`: Swagger/OpenAPI parsing or requirements-text contract extraction, scoped by the reuse decision. API equivalent of `playwright-browser-exploration`. |
| [api-client-generator](skills/api-client-generator/README.md) | `api-exploration.md` + `testcases.json` + `framework-profile.json` (`apiFramework`) → `clients/`: generates/reuses API client classes. Never writes to `index/<clients|api|services>/` - the index is developer-maintained. API equivalent of `page-object-generator`. |
| [api-test-script-generator](skills/api-test-script-generator/README.md) | `clients/` + `testcases.json` → `tests/` (`<Feature>ApiTest.spec.js`): generates executable API test specs. API equivalent of `test-script-generator`. |
| [pipeline-state](skills/pipeline-state/README.md) | Shared checkpoint/resume utility (not an artifact-producing Skill) - `artifacts/<slug>/pipeline-state.json` records which of 9 pipeline stages are NOT_STARTED/IN_PROGRESS/COMPLETED/FAILED/SKIPPED/BLOCKED, so a restarted pipeline resumes at the last valid checkpoint instead of repeating expensive work (especially MCP exploration). A stage is COMPLETED only when its output artifact actually validates - re-checked on every resume, never blindly trusted (the one exception, `reuse-check`, has no artifact and completes only via an explicit checkpoint call). Internal state only - never a story artifact. |
| [playwright-browser-exploration](skills/playwright-browser-exploration/README.md) | `test-plan.md` + the in-memory reuse decision → `exploration.md` via Playwright MCP, scoped to only what existing automation doesn't already cover. |
| [test-case-documenter](skills/test-case-documenter/README.md) | `test-plan.md` + `exploration.md` → `test-cases.md` + `testcases.json`. |
| [page-object-generator](skills/page-object-generator/README.md) | `exploration.md` + `testcases.json` → `pageobjects/`. Never writes to `index/page-objects/` - the index is developer-maintained. |
| [test-script-generator](skills/test-script-generator/README.md) | `testcases.json` + `exploration.md` + existing `page-objects/` → `tests/`, reusing existing Page Object methods whenever one already covers a required interaction. |

## Coding Standards

See [coding-standards.instructions.md](instructions/coding-standards.instructions.md) for enterprise coding conventions, [naming.instructions.md](instructions/naming.instructions.md) for naming conventions, and [playwright.instructions.md](instructions/playwright.instructions.md) for Playwright-specific conventions.

## Future Extensibility

- UI frameworks: Selenium, Cypress, Appium.
- API protocols: REST, GraphQL, SOAP.
- Messaging: Kafka.
- Each is added as a new specialist agent plus its own Skills, following the same thin-agent, artifact-driven pattern already established for UI and API.