# Framework Discovery

## Purpose

Identify the automation technology stack and repository structure - programming language, UI/API automation technology, test runner, automation architecture, build tooling, reporting, CI/CD, MCP configuration, and the location of key framework directories.

**Framework Discovery identifies the automation technology and repository structure. It does not perform UI/API exploration.** That is the responsibility of later, specialized Skills (`playwright-browser-exploration` and `api-contract-analyzer`).

This Skill is code/repository discovery only. It never launches a browser or an MCP session, and it never calls a live API.

## When It Should Be Invoked

- By `central-automation-orchestrator`, early in the pipeline - after understanding the raw request, before delegating to a UI/API specialist agent (`test-generator-ui`, `test-generator-api`) - so the orchestrator (and, transitively, the agent it delegates to) already knows what kind of framework it's generating into.
- On explicit request (e.g. "re-discover the framework", "the tech stack changed").
- Automatically, whenever `artifacts/indexes/framework-profile.json` is missing or stale (see Staleness below) - the Skill self-detects this, so callers do not need to check first.

It is **not** invoked once per Skill inside the UI/API pipelines. Framework identity does not change mid-pipeline; treat the profile as framework-level context established once per session/request, not re-derived per Skill.

## What It Scans

Only static repository evidence, read directly off disk:

- `package.json` (dependencies/devDependencies), `package-lock.json` / `yarn.lock` / `pnpm-lock.yaml`
- `pom.xml`, `build.gradle` / `build.gradle.kts`, `requirements.txt`, `pyproject.toml` (absence is evidence too - e.g. no `pom.xml` rules out Java)
- `playwright.config.js` / `.ts`, `cypress.config.*`, `tsconfig.json`
- `.vscode/mcp.json`
- `.github/workflows/*.yml`, `Jenkinsfile`, `azure-pipelines.yml`
- Directory listings: `page-objects/`, `tests/`, `utils/`, `api/`, `clients/`, `fixtures/`, `.github/{agents,skills,hooks,workflows}/`, `artifacts/indexes/`

## What It Detects

See `artifacts/indexes/framework-profile.json` schema below. Ten categories: language, UI automation technology, API automation technology, test runner, automation architecture (UI and API separately), important directory locations, build/package management, reporting, CI/CD, and MCP configuration.

## What It Must NOT Do

- Must NOT launch Playwright MCP or any browser.
- Must NOT navigate to the application under test.
- Must NOT take screenshots or inspect the live DOM.
- Must NOT call live APIs or fetch a Swagger/OpenAPI document over the network.
- Must NOT execute application workflows.
- Must NOT invent a value it cannot establish from repository evidence - use `"unknown"` instead of guessing.
- Must NOT generate `artifacts/indexes/capabilities/` or any business-capability abstraction file - out of scope for this Skill (that decision belongs to the class-index reuse layer, see `.github/capabilities/`).

## Output Format

A single artifact: `artifacts/indexes/framework-profile.json`.

```json
{
  "version": "1.0",
  "generatedAt": "<ISO timestamp>",
  "signature": "<sha256 of the evidence this profile was built from>",
  "language": "JavaScript | TypeScript | Java | Python | other | unknown",
  "uiFramework": "Playwright | Selenium | Cypress | none | unknown",
  "apiFramework": "RestAssured | Playwright API | Supertest | Requests | other | unknown",
  "testRunner": "Playwright Test | JUnit | TestNG | Jest | Mocha | other | unknown",
  "architecture": {
    "ui": "Page Object Model | Screenplay | custom framework | unknown",
    "api": "API client pattern | utility-based framework | unknown"
  },
  "packageManager": "npm | Maven | Gradle | pip | yarn | pnpm | unknown",
  "reporting": ["Allure", "Playwright HTML", "..."],
  "ci": ["GitHub Actions", "Jenkins", "Azure DevOps", "..."],
  "mcp": ["Playwright MCP", "Atlassian MCP", "..."],
  "directories": {
    "pageObjects": "...", "tests": "...", "apiClients": "...",
    "utilities": "...", "testData": "...", "fixtures": "...",
    "configuration": "...", "hooks": "...", "skills": "...",
    "agents": "...", "workflows": "...", "capabilityIndex": "..."
  }
}
```

Every field is either a value grounded in repository evidence or the literal string `"unknown"`. Array fields (`reporting`, `ci`, `mcp`) are empty arrays, not `"unknown"`, when nothing is detected.

## Staleness

`signature` is a SHA-256 hash of the specific evidence this Skill reads (manifest file contents + the directory listings above) - not a timestamp-based cache. On each invocation:

1. Recompute the signature from current repository state.
2. If `artifacts/indexes/framework-profile.json` is missing, or its stored `signature` doesn't match, the profile is stale → regenerate.
3. Otherwise, reuse the existing profile unchanged - no re-scan, no re-write.

This means editing a test spec or a single Page Object method does **not** invalidate the profile (those aren't part of the signature); adding/removing a dependency, a config file, or a `.github/{agents,skills,hooks,workflows}` entry does.

## How Agents Should Consume The Result

- `central-automation-orchestrator` calls `node .github/skills/framework-discovery/detect.js` (no flags - it self-detects staleness) before determining the UI/API generation path, and reads the resulting `artifacts/indexes/framework-profile.json` into its context package alongside the routing decision it hands off.
- Specialist agents (`test-generator-ui`, `test-generator-api`) receive the profile from the orchestrator rather than re-running discovery themselves.
- `test-generator-ui`'s reuse check (`.github/hooks/02.5_intelligent-reuse-enforcement.hook.md`) and `page-object-generator` may read `directories.pageObjects` / `architecture.ui` from the profile instead of re-deriving them.
- If `uiFramework` or `apiFramework` is `"unknown"` or `"none"` for the kind of work requested, the consuming agent should surface that as a blocker/question rather than guessing a framework to generate against.

## Relationship To `.github/hooks/03_framework-discovery.hook.md`

That hook performs a related but distinct job: broader per-run framework/dependency verification (including missing-dependency warnings) scoped to *before each UI/API generation agent runs*, writing `framework-analysis.md`. This Skill is the single, cached, orchestrator-level source of "what is this repository" truth, written once per repository-state change to a structured JSON profile. The hook is not modified by this Skill's introduction; over time the hook may be simplified to read `framework-profile.json` instead of re-detecting frameworks itself, but that consolidation is out of scope here.

## Failure Handling

- If no `package.json`, `pom.xml`, `build.gradle`, `requirements.txt`, or `pyproject.toml` exists: set `language` to `"unknown"` and continue - do not fail the pipeline.
- If `.vscode/mcp.json` is missing or unparsable: `mcp` is an empty array.
- If `artifacts/indexes/` cannot be written to (permissions, read-only filesystem): WARN and continue with an in-memory profile; downstream agents fall back to per-Skill detection as if no profile existed.

## Logging

```
[Framework Discovery] ✓ framework-profile.json generated
[Framework Discovery]   language: JavaScript
[Framework Discovery]   uiFramework: Playwright
[Framework Discovery]   testRunner: Playwright Test
[Framework Discovery]   architecture.ui: Page Object Model
```

or, when reused:

```
[Framework Discovery] ✓ Existing framework-profile.json is current - reusing it.
```
