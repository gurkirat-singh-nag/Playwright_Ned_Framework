# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

Two layers, both live here:

1. **A runnable Playwright JS test suite** (`page-objects/`, `tests/`, `playwright.config.js`) that automates the OrangeHRM public demo site (`https://opensource-demo.orangehrmlive.com/web/index.php`).
2. **An agentic orchestration scaffold** under `.github/` (agents, skills, instructions, prompts) that generates and heals suite #1's tests from Jira stories, via an artifact pipeline. This scaffold is not itself runnable code — it's Markdown specs consumed by Claude Code agents.

## Commands

```bash
npx playwright test                        # run all tests (headed, chromium only)
npx playwright test tests/applyLeaveTest.spec.js   # run a single spec file
npx playwright test -g "TC-001"             # run tests matching a title/grep pattern
npm run script                              # run tests with line + allure reporters
npm test                                    # run tests, generate Allure report, open it
npm run allurereport                        # regenerate Allure HTML from ./allure-results
```

There is no lint/build/typecheck script configured. `pretest` (via npm lifecycle) clears `./allure-report` and `./allure-results` before a run.

## Test suite architecture

- **Config** (`playwright.config.js`): `testDir: ./tests`, only the `chromium` project is enabled (firefox commented out), `headless: false`, screenshots and video always on, trace `retain-on-failure`, `retries: 0`, `fullyParallel: false`, 60s timeouts. `storageState: "./auth.json"` is wired up but currently commented out.
- **Page Objects** (`page-objects/*.js`): one class per page, CommonJS, `camelCase` class name with `Page` suffix, exported as `module.exports = { className }`. Locators are declared in the constructor; prefer `getByRole`/`getByLabel`/`getByPlaceholder` over CSS/XPath. Methods represent user-facing actions (`selectLeaveType`, `assignLeave`), not raw element getters. `expect` assertions belong in specs, not in Page Objects.
- **Specs** (`tests/*.spec.js`): CommonJS requires, one `test.describe` per feature, reuse test data from `utils/testDataUtils.json` instead of hardcoding values, reuse `auth.json` storage state for authenticated flows where applicable. Test files follow `<Feature>Test.spec.js`; individual cases are tagged `TC-###` and tie back to a Jira story ID (`KAN-1`, `KAN-2`, ...) used as the `describe` block name.
- **Reporters**: HTML (`playwright-report/`), line, and Allure (`allure-results/` → `allure-report/`).

## Agentic pipeline architecture (`.github/`)

Before routing a request, `central-automation-orchestrator` runs the `framework-discovery` Skill (`node .github/skills/framework-discovery/detect.js`) to identify the repository's tech stack from static evidence only (`package.json`, config files, directory structure — never a browser/MCP session). Result is cached at `artifacts/indexes/framework-profile.json`, keyed by a signature hash of the evidence it read; only regenerated when that evidence changes. See [.github/skills/framework-discovery/README.md](.github/skills/framework-discovery/README.md).

The scaffold implements a strict, one-directional artifact pipeline, each phase owned by a single-responsibility **Skill**, coordinated by a thin **Agent** that contains no generation logic itself:

```
Jira Story
  -> requirements.md                (jira-story-analyzer)
  -> test-design.md / .json         (test-architect - technology-neutral, AC-traceable scenarios)
  -> test-validation.md / .json     (test-validator - GATE: BLOCKED stops the pipeline here)
  -> reuse-decision.json            (02.5_intelligent-reuse-enforcement.hook.md)
  -> exploration.md + screenshots/  (playwright-browser-exploration, via Playwright MCP)
  -> test-plan.md                   (test-plan-generator)
  -> test-cases.md / testcases.json (test-case-documenter)
  -> page-objects/                  (page-object-generator)
  -> tests/                         (test-script-generator)
```

`test-architect` (see [.github/skills/test-architect/README.md](.github/skills/test-architect/README.md)) answers "what should we test" - acceptance-criteria-traceable scenarios, automation/manual classification, test data, risks - strictly before "what can we reuse" (the hook above) and "how do we implement it" (the generator Skills). It never writes automation code and never launches MCP.

`test-validator` (see [.github/skills/test-validator/README.md](.github/skills/test-validator/README.md)) is a **gate** immediately after it: validates `test-design.json` for completeness, traceability, duplication, automation feasibility, technology consistency, and artifact integrity (including catching a malformed `testcases.json` from an earlier pipeline run - never repaired automatically, only reported). `status: BLOCKED` stops the pipeline before capability discovery or generation ever run. Half of it is deterministic code (`.github/skills/test-validator/validate.js`); half is reasoning applied by the invoking agent, same split as Test Architect vs. Framework Discovery.

Both `test-architect` and `test-validator` are **shared** between the UI pipeline above and the API pipeline (`test-generator-api.agent.md`) - not duplicated per project type. The API pipeline continues past the gate into `api-capability-discovery` (see [.github/skills/api-capability-discovery/README.md](.github/skills/api-capability-discovery/README.md)): the API equivalent of the reuse-enforcement hook, searching `artifacts/indexes/api/` (one file per real API client class, same "no business-capability abstraction" contract as `artifacts/indexes/classes/`) and deciding `FULL_REUSE`/`PARTIAL_REUSE`/`NO_REUSE` before any Swagger/live-API exploration is allowed to run. **This repository currently has zero API automation** (no client source, no `axios`/`supertest`/`rest-assured` dependency) - the index and searches are built to work correctly the moment one is added, not around fabricated examples.

Every stage above is checkpointed to `artifacts/<slug>/pipeline-state.json` via the shared [.github/skills/pipeline-state/state.js](.github/skills/pipeline-state/state.js) utility (not a Skill - plumbing every agent calls at existing Skill boundaries). A stage is `COMPLETED` only when its artifact is re-validated on disk, never merely because an agent invoked it; a `BLOCKED` Test Validator result records `status: "BLOCKED"` durably, so a restarted pipeline re-checks the blocker instead of silently marching past it; a `FULL_REUSE` capability-discovery decision marks `exploration` `SKIPPED` and that survives a restart too - the core point of the mechanism is that resuming an interrupted pipeline never re-launches MCP for a stage that was already resolved.

Every run's artifacts live under `artifacts/<slug>/` (e.g. `artifacts/kan-1/`, `artifacts/kan-2/`), where `<slug>` matches the driving Jira story ID. No artifact is regenerated once it exists and remains valid.

- `agents/central-automation-orchestrator.agent.md` — entry-point router; classifies the request (Jira ID, Epic, Swagger, URL, failing test, etc.) and delegates to one specialist agent below. Never generates artifacts itself.
- `agents/ui-automation-specialist.agent.md` — coordinates the 6-Skill UI pipeline above.
- `agents/test-generator-api.agent.md` — same pattern for API tests (most of its Skills are declared but not yet implemented).
- `agents/unified-test-healer.agent.md` — diagnoses a failing test and applies the smallest safe fix; delegates CI evidence gathering to `jenkins-analyzer`.
- `agents/jenkins-analyzer.agent.md` — read-only Jenkins build analysis.
- `agents/epic-to-user-stories.agent.md` — breaks a Jira Epic into candidate stories for the pipeline.
- `skills/*/README.md` — one folder per pipeline phase (see table above), each documenting Purpose/Inputs/Outputs/Failure handling. Skills are shared across agents; no duplicated logic between them.
- `prompts/*.prompt.md` — parameterized entry points bound to one agent: `start-test-automation` -> orchestrator, `generate-playwright-test` -> ui-automation-specialist, `generate-api-test` -> test-generator-api, `heal-playwright-test` -> unified-test-healer.
- `instructions/*.instructions.md` — auto-attached conventions (via `applyTo` globs) for naming, artifact schemas, coding standards, and the Page Object / spec conventions described above.
- `schemas/testcases.schema.json`, `templates/*` — JSON schema and Markdown templates each Skill's output must conform to.
- `.vscode/mcp.json` — registers the Playwright MCP server (`@playwright/mcp`) used by `playwright-browser-exploration`, and an Atlassian MCP server for Jira/Confluence access used by `jira-story-analyzer`.

Design principles stated in `.github/copilot-instructions.md` (the canonical architecture doc — read it for the full picture): single responsibility per Agent/Skill, strictly forward artifact flow, thin agents with no business logic, and extensibility to other frameworks (Selenium, Cypress, Appium) or protocols (REST, GraphQL, SOAP, Kafka) by adding new specialist agents/skills without touching the orchestrator's routing.

### Intelligent reuse layer: `.github/capabilities/` + class index

Before `playwright-browser-exploration` launches Playwright MCP, the pipeline checks whether existing Page Objects already cover the story's required actions — MCP/browser exploration is expensive and should be a last resort, not the default source of knowledge.

- **Source of truth**: `page-objects/*.js`. The index is *generated metadata*, never authoritative — it's fully rederived from source on every run and never accumulates stale entries.
- **Index**: `artifacts/indexes/_manifest.json` + one file per Page Object under `artifacts/indexes/classes/`. Regenerate with `node .github/capabilities/generator.js`; check for drift with `node .github/capabilities/validator.js` (`--fix` to regenerate in place, `--ci` for pipelines).
- **Search**: `.github/capabilities/search-simplified.js` (`ClassIndexSearch`) — `searchClasses(query)`, `searchMethods(query)`, `analyzeReuseCoverage(requiredActions)` (returns REUSE ≥100% / PARTIAL 50–99% / EXPLORE <50% coverage with `skipExploration`/`explorationScope`), `verifyMethodsInSource(className, methods)` to catch a stale index. CLI: `node .github/capabilities/search-simplified.js "<query>"`.
- **Hook**: [.github/hooks/02.5_intelligent-reuse-enforcement.hook.md](.github/hooks/02.5_intelligent-reuse-enforcement.hook.md) runs between `jira-story-analyzer` and `playwright-browser-exploration`, writing `artifacts/<slug>/reuse-decision.json`, which `playwright-browser-exploration` reads at its Step 0 to decide whether to skip/scope/fully run exploration.
- **Deliberately excluded**: no `artifacts/indexes/capabilities/` business-capability abstraction layer — that was built (v1/v2), found over-engineered, and removed in favor of direct class/method search (v3.0, documented in `artifacts/validation/SIMPLIFIED_ARCHITECTURE_IMPLEMENTATION_SUMMARY.md`). Do not reintroduce a capability-name indirection layer.
- CI: `.github/workflows/validate-capability-indexes.yml` regenerates the index and fails the build if committed indexes drift from source, or if a `capabilities/` directory reappears.

None of `.github/capabilities/`, `.github/hooks/`, or `.github/workflows/` are committed to git yet — they're working-tree state on this branch.
