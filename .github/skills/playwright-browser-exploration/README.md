# Playwright Browser Exploration

## Purpose

Explore the target application using Playwright MCP to validate and enrich `test-plan.md`'s scenarios, producing a factual, evidence-based map of the application's UI, navigation, and locators - but **only for the gaps existing automation doesn't already cover**.

## Inputs

- `artifacts/<slug>/test-plan.md` - required. By the time this Skill runs, `test-plan.md` always exists (written by `test-plan-generator` or, for the `manual-test-case` route, by `input-normalizer`) - there is exactly one contract for where scope comes from, not two.
- The reuse decision (`recommendation`, `skip_exploration`, `exploration_scope`, `found_methods`, `missing_actions`) - handed directly to this Skill in-memory by the invoking agent, computed by the Existing Automation/Index step immediately before this Skill runs (see [02.5_intelligent-reuse-enforcement.hook.md](../../hooks/02.5_intelligent-reuse-enforcement.hook.md)). This Skill does not read a persisted `reuse-decision.json` file - none exists.

## Outputs

- `exploration.md`
- `screenshots/`

## Artifacts Produced

- `exploration.md` - structure defined in [exploration-template.md](../../templates/exploration-template.md). Always written, even when exploration itself is skipped entirely (see Step 0) - it records the reuse information in that case instead of live findings.
- `screenshots/` - one image per captured step/scenario (empty when exploration was fully skipped).

## Artifacts Consumed

- `test-plan.md` only. This Skill must never contact Jira or Confluence directly - any requirement context must already be present in `test-plan.md`.

## Execution Steps

### Step 0: Apply The Reuse Decision

- `skip_exploration: true` (100% coverage, decision `REUSE`) - do not launch Playwright MCP or take screenshots. Write `exploration.md` directly from the reused Page Objects' existing method/locator data (see Content Strategy below) and exit early.
- `exploration_scope: "selective"` (decision `PARTIAL`) - explore only `missing_actions` from the decision; reuse everything else without re-visiting it.
- `exploration_scope: "full"` (decision `EXPLORE`) - proceed to Step 1 as normal, full exploration.

### Step 1: Check Artifact Existence

Check whether `exploration.md` already exists and is structurally valid for the current `test-plan.md`.

### Step 2: Reuse Existing Artifact

If valid, skip execution and reuse the existing file and screenshots.

### Step 3: Determine Exploration Scope

Parse `test-plan.md` for the scenario(s) in scope (all of them, or just `missing_actions` per Step 0) and any URLs/workflows they imply. Use the existing Playwright configuration's `baseURL` for navigation.

### Step 4: Navigate Application

Navigate the target application using Playwright MCP: Navigate, Snapshot, Click, Fill, Hover, Keyboard, Wait, DOM Inspection, Accessibility Tree, Screenshot.

Before exploring a workflow, check `page-objects/` for an existing Page Object that already covers it - reuse its known locators/methods and skip re-exploring pages it already fully covers. Explore only what isn't already covered.

**Intelligent Snapshot Usage:**
- Use snapshot ONLY when UI state needs understanding
- Skip snapshot if locators already known from existing Page Objects
- Snapshot after navigation to new/unexplored pages
- Snapshot for recovery/debugging when necessary

### Step 5: Record Observations

Record locators, navigation flow, controls (tables, forms, buttons, dropdowns, dialogs), and observed validation messages. Note which locators were reused from an existing Page Object vs. newly discovered.

When citing an existing Page Object, test, or other repository source as evidence for a reuse pattern or implementation convention, inspect that source and verify the cited behavior is actually present before making the claim - do not state that an existing test demonstrates a particular usage pattern unless that pattern is actually present in the inspected source.

### Step 6: Write Artifacts

Write `exploration.md` and `screenshots/`.

**Content Strategy:**

```markdown
# exploration.md

## Application Map

### Login Page (REUSED FROM EXISTING ASSET)
- Page Object: loginPage.js
- Methods: goto(), validUserLogin(), assertUserValidation()
- Locators: (loaded from existing source)
- Reuse decision: REUSE (100% coverage) - no browser exploration performed for this scenario.

### Checkout Page (NEWLY EXPLORED)
- URL: https://...
- Locators: (captured via Playwright MCP)
- Navigation: Dashboard → Cart → Checkout
...
```

For a fully-reused story (`skip_exploration: true`), `exploration.md` contains only the reuse-information block above - no live navigation ever occurred, and the file says so explicitly rather than implying exploration happened.

## Failure Handling

- Application unreachable, or credentials/environment access unavailable: record the limitation in `exploration.md` under Application Map/Navigation Flow instead of fabricating data; continue with partial coverage where possible.
- Total exploration failure (no page reachable): stop the pipeline and report before `test-case-documenter` runs, since it has no evidence to consume.
- `test-plan.md` does not exist: stop and report the missing upstream artifact - do not proceed with an assumed scope.

## Retry Strategy

- Retry transient navigation/network timeouts up to 3 times with backoff.
- Do not retry permanent failures (404, application confirms feature does not exist).

## Logging

- Log: the reuse decision this run received, pages/screens visited (if any), elements captured, locator strategy distribution, screenshot count, and any recorded limitations.

## Future Extensions

- Authenticated and multi-role exploration.
- Visual regression baseline capture.
- Support for additional browser automation protocols (Selenium, Cypress).
