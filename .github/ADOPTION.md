# Using This Scaffold In Your Playwright Project

This `.github/` folder is a portable AI-agent scaffold that generates and heals Playwright automation from Jira stories (or plain-language requests), and reuses your existing Page Objects/API clients before ever launching a browser. It is not tied to this repository - copy `.github/` into any Playwright project and it works the same way. This guide is for a team adopting it for the first time.

**Scope**: this guide covers Playwright projects specifically (UI via Playwright Test, and API automation the `api-automation-specialist` pipeline generates alongside it). A separate adoption guide covers RestAssured-only (Java) projects, where the same scaffold applies but the calibration step below (§3) looks different - Java naming, Maven layout, JUnit/TestNG idioms instead of Playwright's.

## 1. What You're Getting

Six agents, invoked by name or via `/start-test-automation`:

| Agent | Use it for |
|---|---|
| `central-automation-orchestrator` | The default entry point. Paste anything - a Jira ID, a URL, a plain-language requirement, a failing test, an ADO build - and it routes to the right specialist below. When in doubt, start here. |
| `ui-automation-specialist` | UI test generation: Jira story or requirement → Page Objects + Playwright specs. |
| `api-automation-specialist` | API test generation: Swagger/OpenAPI spec or requirement → API clients + test specs. |
| `automation-healer-specialist` | A test is failing - diagnose root cause and apply the smallest safe fix. |
| `ci-analyzer-specialist` | Investigate an Azure DevOps pipeline build and categorize failures before handing off to the healer. |
| `epic-to-user-stories` | Break a Jira Epic into candidate stories before running the pipeline on each. |

Behind the scenes, each generation request runs a fixed pipeline - test plan (acceptance criteria, scenarios, and an inline quality gate, all produced in one step) → existing-automation/index check → exploration (only for the gaps that check found) → test cases → generated code - documented in full in [copilot-instructions.md](copilot-instructions.md). You don't need to invoke pipeline stages yourself; the agent you pick does that. (Earlier versions of this scaffold had separate `requirements.md`/test-design/test-validation artifacts and a standalone validation gate - these were merged into the single test-plan step; if you see them referenced anywhere outside this doc, that reference is stale.)

**Shortcuts**: four of the agents also have a slash-command entry point that skips naming the agent explicitly - use whichever you prefer, they're equivalent:

| Slash command | Goes straight to |
|---|---|
| `/start-test-automation` | `central-automation-orchestrator` (classify-and-route) |
| `/generate-playwright-test` | `ui-automation-specialist` directly |
| `/generate-api-test` | `api-automation-specialist` directly |
| `/heal-playwright-test` | `automation-healer-specialist` directly |

`ci-analyzer-specialist` and `epic-to-user-stories` have no slash shortcut - invoke them by name.

## 2. Prerequisites

- A Playwright project - either an existing one with `page-objects/` (or equivalent) and `tests/` folders already in place (the scaffold reuses your conventions, it doesn't impose new ones), or nothing at all - see "Starting From Zero" below if you're beginning a brand-new project.
- VS Code + GitHub Copilot Chat with custom agents/prompt files enabled (or an equivalent agent runtime - see the note at the bottom on Claude Code).
- Optional: [Atlassian MCP](https://mcp.atlassian.com) configured if you want agents to fetch Jira stories directly, and Playwright MCP if you want live browser exploration for genuinely new UI. Both are declared in `.vscode/mcp.json`. **Neither is required to use this scaffold** - see the MCP-unavailable note in §5 if you don't have them.

### About `.vscode/mcp.json`

```json
{
  "servers": {
    "playwright": { "type": "stdio", "command": "npx", "args": ["-y", "@playwright/mcp@latest"] },
    "atlassian": { "type": "http", "url": "https://mcp.atlassian.com/v2/mcp" }
  }
}
```

**Commit this file** - as shipped, it contains no secrets, just server declarations. Playwright MCP needs no configuration (`npx` fetches it on demand); Atlassian MCP's URL is a public endpoint - authentication happens as an interactive OAuth sign-in inside VS Code the first time you use it, not as anything stored in this file. If your team later adds an MCP server that genuinely needs a secret (an API key, an internal server's token), use VS Code's `${input:...}` variable prompt mechanism to keep the secret out of the committed file, rather than pasting it directly into `mcp.json`.

### Starting From Zero (No Existing Playwright Project)

If you don't have a Playwright project yet, create one first - the scaffold generates *into* a project, it doesn't scaffold the project itself:

```bash
npm init -y
npm install --save-dev @playwright/test
npx playwright install chromium
mkdir page-objects tests
```

Then write a minimal `playwright.config.js` (`testDir: './tests'`, a `baseURL`, one `chromium` project is enough to start). Once `npx playwright test` runs (even with zero tests), proceed to setup below exactly as an existing project would.

## 3. One-Time Setup

1. **Copy two things into your repo**: the whole `.github/` folder, and `.vscode/mcp.json`. Nothing else is required - there's no install script, no dependency to add to `package.json`.
2. **Confirm your Copilot/agent runtime picks up the custom agents** - you should see `central-automation-orchestrator` etc. available as agents or via `/start-test-automation`.
3. **Calibrate the instructions to your repo's actual conventions - do this before generating anything.** This is the step most teams skip and then wonder why generated code doesn't look like theirs.

   `.github/instructions/*.instructions.md` ships with *this* repo's actual conventions written in as concrete examples - `camelCase` Page Object classes, CommonJS `module.exports`, a specific `auth.json`/`testDataUtils.json` pattern, Allure reporting. These aren't universal Playwright rules; they're this project's choices. Copying `.github/` into your repo without updating them means agents will generate code following someone else's conventions, not yours.

   **Starting from zero, with no existing Page Objects to read?** This step is a no-op for now - the shipped defaults apply until your team decides otherwise. There's nothing to reverse-engineer from an empty `page-objects/` folder, so skip straight to writing your first story; revisit this prompt once you have a handful of real generated/hand-written classes to calibrate against, or the moment your team makes an explicit convention choice (e.g. "we're using TypeScript, not JS").

   Don't figure this out from scratch by hand - paste the prompt below to your agent. It does the same thing `/init` does for a general codebase (deep-read the repo, then write down what it found), scoped specifically to this scaffold's instruction files, so the team doesn't have to reinvent conventions their codebase already has:

   ```
   The .github/ folder in this repo is an AI-agent scaffold that generates and
   heals Playwright/API test automation from Jira stories or plain-language
   requests, reusing existing Page Objects/API clients before exploring the
   app. It ships with example conventions from a different codebase baked
   into its instruction files (camelCase Page Objects, CommonJS, a specific
   auth/test-data pattern, Allure). Your job in this pass is purely to
   replace those borrowed examples with THIS repo's actual, real conventions,
   so that everything the scaffold generates afterward looks like this team
   wrote it - not like it was copy-pasted from wherever the scaffold came
   from. Do not generate or change any test automation yet; this is a
   calibration pass over .github/ instruction files only.

   Deeply analyze this repository's actual test automation setup before changing
   anything else in .github/. Specifically:

   1. Identify the language, UI automation framework, API automation framework
      (if any), test runner, and package manager actually in use - read
      package.json / pom.xml / requirements.txt, config files, and installed
      dependencies directly. Do not guess.

   2. Read every EXISTING Page Object / API client class already in this repo
      (not this scaffold's own examples) and extract the real conventions
      already in use:
      - Locator strategy and its priority order (getByRole, getByTestId,
        data-*, CSS, XPath - whatever is actually used, in whatever order)
      - Class naming convention (casing, suffix, file extension)
      - Export/import style (CommonJS, ES modules, TypeScript classes)
      - Folder structure for page objects/clients and for tests
      - Test file naming and grouping conventions (test.describe, JUnit/TestNG
        annotations, etc.)
      - Authentication/session handling pattern
      - Test data source and how it's loaded
      - Reporters and CI already wired up

   3. Do NOT invent new conventions and do NOT keep this scaffold's own
      shipped-in defaults (camelCase Page Object classes, CommonJS, an
      auth-storage-state file, a JSON test-data fixture, Allure) unless this
      repo genuinely already uses them. The goal is to codify what THIS repo
      already does, not reinvent it or impose a different style.

   4. Update these files to reflect exactly what you found in step 2,
      replacing every example that doesn't match this repo:
      - .github/instructions/page-object.instructions.md
      - .github/instructions/naming.instructions.md
      - .github/instructions/playwright.instructions.md
      - .github/copilot-instructions.md's directory/architecture section,
        only if this repo's layout differs from what it currently documents

   5. Leave .github/instructions/coding-standards.instructions.md and
      .github/instructions/artifact-naming.instructions.md /
      artifact-schemas.instructions.md untouched unless you find a specific,
      real convention in this repo that conflicts with them.

   6. Also run the repo-convention-discovery Skill
      (.github/skills/repo-convention-discovery/README.md) as part of this
      same pass: record the actual folder(s) where Page Object / API client
      style classes and tests live in THIS repo, and write them into
      index/framework-profile.json's "conventions" field
      (pageObjectsPath / apiClientsPath / testsPath). Do this by reading
      real files, not by assuming this scaffold's own default folder name
      (page-objects/) - that default only applies when nothing else is
      found. This step is what lets framework-discovery correctly report
      architecture.ui / directories.pageObjects for a repo laid out
      differently than this one (a different top-level folder name, or a
      Maven/Gradle Java project with no single top-level folder at all)
      instead of falling back to "unknown".

   7. Show me a summary of what you found and exactly what you changed
      (instructions files AND framework-profile.json's conventions field)
      before I review it. Do not commit.
   ```

   This is a one-time calibration per project - re-run the same prompt only if your team's conventions change later. It's the difference between generated code that looks like your team wrote it and code that looks copy-pasted from a different one.

4. **Bootstrap the reuse index for any existing Page Objects/clients the scaffold didn't create - skip this if you're starting from zero.** With no existing code, `index/` starting empty is a valid state (see §4, "Going From Zero To Useful") - the first few stories just explore fully instead of reusing, and you index each newly-generated class yourself right after (the pipeline never does this automatically - see §4). But if you already have real Page Objects/clients, skipping this is a real risk, not a neutral skip: a story that could reuse your existing `LoginPage.js` will score 0% (nothing to match against yet) and may generate a *duplicate* Page Object instead of reusing it. You don't need to index your whole suite upfront - a handful of high-traffic pages (login, shared nav) is enough to start; the rest can be indexed just-in-time, in the same PR as the story that first touches them. List the specific files, then paste:

   ```
   Read the following existing Page Object / API client classes and write or
   update their matching index/ entry for each - do not touch anything else
   in the repo:

   <list the specific file paths here, e.g. page-objects/loginPage.js,
   page-objects/dashboardPage.js - do not say "all of them" for a large
   existing suite; index a deliberately chosen handful per pass>

   For each class listed:

   1. Read the actual class source - do not guess methods from the file name
      or from any similarly-named class elsewhere.

   2. List every public, test-facing method with its real parameters (name
      and order, not types) exactly as defined. Do NOT include private/
      internal helper methods not meant to be called from a test.

   3. Write one real, specific, one-line description per method describing
      what it DOES, not restating its name - "Navigate to the login page",
      not "Goto method". A vague or missing description is the single
      biggest reason the reuse search will later fail to match a real,
      correct requirement against this method.

   4. Write (or overwrite) the matching file under index/page-objects/
      (or index/clients/, index/api/, index/services/, matching wherever
      the class actually lives) named <className>.json, following the shape
      in page-object.instructions.md / api-client.instructions.md:
      { "className", "file", "methods": [{ "name", "params", "description" }] }.

   5. Do NOT invent methods that don't exist in the source.

   6. Show me a summary of what you indexed (class name, method count) before
      I review it. Do not commit.
   ```

   §4 documents this same prompt in full ("Bootstrapping The Index For Existing Code"), plus the reasoning behind just-in-time vs. proactive indexing - read that section for the fuller picture, but you don't need to leave this list to act on it.

5. **Only relevant if you skipped item 3 as a greenfield project.** If you followed item 3 against an existing codebase, framework discovery already ran as part of that prompt (it needs `index/framework-profile.json` to exist before it can write `conventions` into it) - nothing further to do here. Otherwise, once your dependencies are actually installed and you have real code in place, run it once yourself: `node .github/skills/framework-discovery/detect.js --force`, so `index/framework-profile.json` reflects your actual stack rather than a stale or absent profile.
6. **Verify the setup actually works, without needing an agent at all.** The scaffold's deterministic pieces are plain Node scripts you can run directly from a terminal - useful both as a first-time sanity check and later for debugging:

   ```bash
   # Confirms your stack was detected correctly
   node .github/skills/framework-discovery/detect.js
   # → should print your real language/uiFramework/testRunner, not "unknown"

   # Confirms the reuse index loads without error (0 classes is fine on day one)
   node .github/capabilities/search-simplified.js --summary

   # Same, for the API-side index (only relevant once you have API clients)
   node .github/skills/api-capability-discovery/search.js --summary

   # Inspects or advances a story's checkpoint/resume state, if one exists
   node .github/skills/pipeline-state/state.js status <slug>
   node .github/skills/pipeline-state/state.js checkpoint <slug> <stage>
   ```

   Test Plan Generator's quality gate is applied inline by the agent, not by a separate script - if a story's `test-plan.md` was blocked, the reason is reported directly in the pipeline's output, not in a separate file to re-check.

That's the entire setup. No build step, no server to run.

## 4. The Reuse Index - Keep It Current Yourself

This comes right after setup, before workflow, deliberately: item 4 of §3 already had you run part of this (bootstrapping the index for any existing code), so this section is the explanation for a step you've either just done or just deliberately skipped as a greenfield project - read it now, while that's still fresh, rather than after you've moved on to running real stories.

Every Page Object/API client has a matching entry under `index/page-objects/<className>.json` (or `index/clients/`, `index/api/`, `index/services/` for API clients) - a small JSON file listing the class's methods, so agents can find and reuse it before exploring your app again. This is what makes the whole "skip the browser if we already have this" optimization work.

**There is no generator script and nothing keeps this in sync automatically - not even when the pipeline itself creates or modifies a Page Object.** By design, `page-object-generator`/`api-client-generator` never create, update, or touch any file under `index/` - the index is entirely your team's responsibility, whether the class it describes was hand-written or pipeline-generated. When you (or a pipeline run) add, rename, or remove a method on a Page Object or client, update its index entry in the same change - same discipline as keeping a test current with the code it covers - using the bootstrap prompt in item 4 below. See [instructions/page-object.instructions.md](instructions/page-object.instructions.md) / [instructions/api-client.instructions.md](instructions/api-client.instructions.md) for the exact format.

This design is why the scaffold works regardless of your project's language (Java/RestAssured, TypeScript, Python) - the index is just structured JSON, authored by hand or AI, never mechanically parsed from source.

**Do not skip the `description` field on each method - it's the single biggest silent-failure risk in this whole scaffold.** The reuse search scores matches by keyword overlap against the method's `name` *and* `description` together. An index entry with only `{ "name": "goto", "params": [] }` and no description will frequently under-match a real, correct requirement - verified directly: the same story scored 0% (recommending full exploration) against a description-less index and 100% (full reuse, no exploration) against the identical index with one sentence of description added per method. Write a real one-line description for every method, every time - `"Navigate to the login page"`, not a placeholder.

Consider adding one line to your PR template or review checklist: *"If this PR adds/changes/removes a Page Object or client method, is its `index/` entry updated too?"* That's a human process nudge, not tooling - deliberately so, since this scaffold has no automated drift detection for the index by design (see above).

### Going From Zero To Useful

`index/` being empty on day one isn't a problem to solve upfront - but unlike earlier versions of this scaffold, it does **not** grow on its own anymore. `page-object-generator`/`api-client-generator` never write to `index/` (see above) - indexing a newly-generated class is a step you (or your agent, prompted explicitly) still have to take:

1. **Story 1 runs** against a page with no index entry → 0% coverage → full exploration → `page-object-generator` creates the Page Object, but writes **no** index entry for it - `index/` still has nothing for that class after the run.
2. **Right after that run** (same PR is the natural point), run the bootstrap-index prompt from item 4 above against the class(es) the run just created, so the next story that touches the same page can actually reuse it.
3. **Story 2**, once that index entry exists, reuses that page (partial or full reuse, exploration skipped or scoped down) or hits a new page (same as story 1: explore, generate, then index it yourself).
4. Repeat. Coverage isn't one global number climbing over time - it's per-page, and now per-page *and* per manual indexing pass. Pages every story touches (login, shared nav, a common modal) are worth indexing immediately since they keep getting hit; a page touched once and never again may not be worth the extra step, which is fine - it was never going to save you much anyway.

**The one case that needs a deliberate decision**: adopting into a codebase that already has real Page Objects/clients the scaffold didn't create. Those have no index entries yet, and unlike the greenfield case, that's a real risk, not a neutral starting point - a story that could reuse an existing `loginPage.js` will score 0% (nothing to match against) and may generate a *duplicate* Page Object instead of reusing the real one.

Two ways to handle it, pick based on how central the page is - don't try to index your entire existing suite on day one, that wastes effort on pages that may never come up again:

- **Just-in-time (default for most classes)**: index a class right before a story is about to touch it, in the same PR as that story.
- **Proactive, only for high-traffic pages**: if you already know login/dashboard/shared-nav will be hit by nearly every story, index those specific classes in one deliberate pass before your first real story.

Either way, use this prompt rather than writing entries by hand - list the specific files you want indexed this pass (a handful of high-traffic pages, or the ones your next story needs). This is the same prompt already given inline in §3 item 4 - it's repeated here rather than only linked, since you'll likely come back to run it again later (a new high-traffic page, a story about to touch an unindexed class) after the one-time setup checklist is long done:

```
Read the following existing Page Object / API client classes and write or
update their matching index/ entry for each - do not touch anything else
in the repo:

<list the specific file paths here, e.g. page-objects/loginPage.js,
page-objects/dashboardPage.js - do not say "all of them" for a large
existing suite; index a deliberately chosen handful per pass>

For each class listed:

1. Read the actual class source - do not guess methods from the file name
   or from any similarly-named class elsewhere.

2. List every public, test-facing method with its real parameters (name
   and order, not types) exactly as defined. Do NOT include private/
   internal helper methods not meant to be called from a test.

3. Write one real, specific, one-line description per method describing
   what it DOES, not restating its name - "Navigate to the login page",
   not "Goto method". A vague or missing description is the single
   biggest reason the reuse search will later fail to match a real,
   correct requirement against this method - see the description-field
   warning above.

4. Write (or overwrite) the matching file under index/page-objects/
   (or index/clients/, index/api/, index/services/, matching wherever
   the class actually lives) named <className>.json, following the shape
   in page-object.instructions.md / api-client.instructions.md:
   { "className", "file", "methods": [{ "name", "params", "description" }] }.

5. Do NOT invent methods that don't exist in the source.

6. Show me a summary of what you indexed (class name, method count) before
   I review it. Do not commit.
```

This is the same "deep-read, then write it down" shape as the calibration prompt in §3 - the difference is scope: calibration updates the *instructions* files once per project, this updates the *index* files, repeatedly, one deliberate batch at a time as you decide a page is worth indexing.

## 5. The Typical Workflow

1. Pick the entry point: usually `central-automation-orchestrator` with `/start-test-automation`, and paste your Jira story ID, a plain-language requirement, or a Swagger URL.
2. The agent classifies your input, checks `index/framework-profile.json` (auto-detected/cached repo tech stack), and delegates to `ui-automation-specialist` or `api-automation-specialist`.
3. Watch Test Plan Generator's **internal quality gate**: a clean `test-plan.md` continues straight through; a non-blocking limitation is noted inline in the file and the pipeline still continues; a blocking problem (missing acceptance criteria, duplicate scenarios, etc.) stops the pipeline before generating anything and reports why - there's no separate `test-validation.json` to check, the reason is in the agent's own output. On a block, fix the story/requirement and re-run rather than trying to push past it.
4. The pipeline checks your existing Page Objects/clients for reuse *before* exploring the app: 100% coverage skips browser/API exploration entirely and generates straight from what exists; partial coverage explores only the specific gaps instead of re-discovering everything; zero coverage explores in full. You'll see which of the three happened in the agent's output - this is exactly what §4's index (or the lack of one) determines.
5. Each stage writes its artifact to `artifacts/<slug>/` as it completes. The agent is also instructed to checkpoint each stage's status into `artifacts/<slug>/pipeline-state.json` (via `node .github/skills/pipeline-state/state.js checkpoint <slug> <stage>`), so a long-running or interrupted pipeline *can* resume from where it left off instead of restarting from scratch - but this checkpointing is a step the agent follows, not something enforced independently of it, so treat `pipeline-state.json`'s presence as a bonus, not a guarantee: if it's missing for a completed story, resume simply isn't available for that run, the three story artifacts themselves are unaffected.
6. You get real, runnable output: new or updated files under `page-objects/`/`clients/` and `tests/`, following your project's existing naming and style conventions (see `.github/instructions/`).

**No Playwright MCP available?** Exploration doesn't hard-depend on it. Without an MCP browser tool, an agent falls back to gathering the same evidence by writing and directly executing a throwaway Playwright script against the real app (navigate, take screenshots, inspect the DOM) instead of calling MCP tools - functionally equivalent, just a different mechanism to get there. This is a real, already-used fallback in this scaffold's own history, not a hypothetical.

## 6. Where To Find (And Use) The Results

Two kinds of output land in two different places - know which one you actually want:

- **`artifacts/<slug>/`** (one folder per story, e.g. `artifacts/proj-1234/`) - the pipeline's working papers: `test-plan.md`, `test-cases.md`/`testcases.json`, and (for UI) `exploration.md` / (for API) `api-exploration.md`, plus internal `pipeline-state.json` checkpoint/resume state. Read the three story artifacts for traceability - which acceptance criterion maps to which test case, what was explored vs. reused, why a scenario was flagged. This is documentation, not code - don't expect it to run.
- **Your real source tree** - `page-objects/`, `clients/`, `tests/` - the actual runnable automation. This is what you run with `npx playwright test` exactly as before; the scaffold doesn't change how you execute tests, only how they get written.

Nothing here is a black box: every generated file is plain Playwright JS (or whatever your project's stack is) that you'd write by hand anyway - the agents just write it for you, following your conventions, with traceability back to the requirement.

**Git visibility differs between the two.** This repo's `.gitignore` excludes all of `artifacts/*` - so `artifacts/<slug>/` working papers are local-only and won't show up in PRs or be shared with the rest of the team unless you deliberately un-ignore them. Everything meant to be committed and shared - `index/framework-profile.json`, the reuse index (`index/page-objects/`, etc.) - lives under `index/` instead, which isn't covered by that exclusion at all, so it's tracked and shared normally with no exception needed. Decide early whether your team also wants the `artifacts/<slug>/` traceability paper trail committed - if so, remove or narrow the `artifacts/*` exclusion for your repo.

## 7. Healing A Failing Test

Invoke `automation-healer-specialist` with the failing spec name, an error message, or an ADO build reference. It gathers evidence, classifies the root cause (locator change, app behavior change, environment issue, flaky test), and applies the smallest fix - it will not redesign your automation architecture or touch unrelated tests. For CI-sourced failures, `ci-analyzer-specialist` investigates the Azure DevOps build first and hands off categorized findings.

## 8. If Something's Unclear

- [copilot-instructions.md](copilot-instructions.md) is the full architecture reference - read it for the complete pipeline diagram and every agent/Skill's responsibility.
- Each Skill has its own `README.md` under `.github/skills/<name>/` documenting its exact inputs, outputs, and failure handling.
- `.github/instructions/*.instructions.md` documents the naming/coding conventions generated code follows - check these if generated output doesn't match your team's existing style, and adjust the instructions file rather than fighting the generator each time.

## 9. Troubleshooting

- **A reuse search returns 0%/`EXPLORE` for something that should obviously match.** Almost always a missing or vague `description` field on the relevant index entry - see the callout in §4. Confirm with `node .github/capabilities/search-simplified.js "<the requirement text>"` and check the score it returns.
- **Copilot doesn't show the custom agents after copying `.github/`.** Reload the VS Code window (custom agents/prompts are picked up on load, not live-watched in every Copilot version). Confirm the files actually landed at `.github/agents/*.agent.md` and `.github/prompts/*.prompt.md`, not nested a level too deep.
- **Generated code doesn't match your team's style.** You skipped or under-did the calibration step (§3.3) - re-run the calibration prompt, this time pointing it at real examples that exist by now.
- **`framework-discovery` reports `"unknown"` for a technology you clearly have.** Its detection is evidence-based only (checks `package.json`/`pom.xml`/config files directly) - confirm the dependency is actually declared where it looks (see [framework-discovery/README.md](skills/framework-discovery/README.md)'s "What It Scans"), then re-run with `--force`.
- **A pipeline run against a real external site is flaky or times out.** Two common, non-code causes, both hit during this scaffold's own testing: `waitForLoadState('networkidle')` never resolving on a site with continuous background network activity (use a specific URL/element wait instead), and Playwright's default 30s test timeout being tight for a flow with several real sequential page loads (raise `timeout` in `playwright.config.js`). Neither is a defect in the generated Page Objects themselves - check the actual error before assuming the generated code is wrong.
- **You don't have Playwright MCP or Atlassian MCP configured.** Neither is required - see the MCP-unavailable note in §5 for exploration, and for Jira, paste the story's text directly into your prompt instead of giving just an ID.

## A Note On Agent Runtimes

This scaffold's `.agent.md`/`.prompt.md` files are written for GitHub Copilot's custom-agent feature. If your team uses Claude Code instead, the same `.github/` folder still works as documentation an assistant can read and follow - Skills, hooks, and instructions are plain Markdown regardless of which AI tool reads them - but Claude Code has no automatic agent-handoff runtime or hook auto-invocation for these files; a session following this scaffold does so by reading and applying it directly rather than a Copilot-specific engine wiring it together automatically.
