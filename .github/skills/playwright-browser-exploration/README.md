# Playwright Browser Exploration

## Purpose

Explore the target application using Playwright MCP to validate and enrich `requirements.md`, producing a factual, evidence-based map of the application's UI, navigation, and locators.

## Inputs

- `requirements.md`
- `artifacts/<slug>/reuse-decision.json` (optional) - written by [02.5_intelligent-reuse-enforcement.hook.md](../../hooks/02.5_intelligent-reuse-enforcement.hook.md) before this Skill runs. When present, it scopes exploration; when absent, this Skill explores fully as if no reuse check occurred.

## Outputs

- `exploration.md`
- `screenshots/`

## Artifacts Produced

- `exploration.md` - structure defined in [exploration-template.md](../../templates/exploration-template.md).
- `screenshots/` - one image per captured step/scenario.

## Artifacts Consumed

- `requirements.md` only. This Skill must never contact Jira or Confluence directly - any requirement context must already be present in `requirements.md`.

## Execution Steps

### Step 0: Check Reuse Decision

If `artifacts/<slug>/reuse-decision.json` exists, read it:

- `skip_exploration: true` (100% coverage, decision `REUSE`) - do not launch Playwright MCP or take screenshots. Generate `exploration.md` directly from the reused Page Objects' existing method/locator data (see Content Strategy below) and exit early.
- `exploration_scope: "selective"` (decision `PARTIAL`) - explore only `missing_actions` from the decision file; reuse everything else without re-visiting it.
- `exploration_scope: "full"` (decision `EXPLORE`, or no decision file present) - proceed to Step 1 as normal, full exploration.

### Step 1: Check Artifact Existence

Check whether `exploration.md` already exists and is structurally valid.

### Step 2: Reuse Existing Artifact

If valid, skip execution and reuse the existing file and screenshots.

### Step 3: Parse Requirements

Otherwise, parse `requirements.md` for URLs and workflows that define exploration scope, narrowed by Step 0's decision when one exists.

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

### Checkout Page (NEWLY EXPLORED)
- URL: https://...
- Locators: (captured via Playwright MCP)
- Navigation: Dashboard → Cart → Checkout
...
```

## Failure Handling

- Application unreachable, or credentials/environment access unavailable: record the limitation in `exploration.md` under Application Map/Navigation Flow instead of fabricating data; continue with partial coverage where possible.
- Total exploration failure (no page reachable): stop the pipeline and report before Test Plan Generator runs, since it has no evidence to consume.

## Retry Strategy

- Retry transient navigation/network timeouts up to 3 times with backoff.
- Do not retry permanent failures (404, application confirms feature does not exist).

## Logging

- Log: pages/screens visited, elements captured, locator strategy distribution, screenshot count, and any recorded limitations.

## Future Extensions

- Authenticated and multi-role exploration.
- Visual regression baseline capture.
- Support for additional browser automation protocols (Selenium, Cypress).
