# Playwright Browser Exploration

## Purpose

Explore the target application using Playwright MCP to validate and enrich `requirements.md`, producing a factual, evidence-based map of the application's UI, navigation, and locators.

## Inputs

- `requirements.md`

## Outputs

- `exploration.md`
- `screenshots/`

## Artifacts Produced

- `exploration.md` - structure defined in [exploration-template.md](../../templates/exploration-template.md).
- `screenshots/` - one image per captured step/scenario.

## Artifacts Consumed

- `requirements.md` only. This Skill must never contact Jira or Confluence directly - any requirement context must already be present in `requirements.md`.

## Execution Steps

1. Check whether `exploration.md` already exists and is structurally valid.
2. If valid, skip execution and reuse the existing file and screenshots.
3. Otherwise, parse `requirements.md` for URLs and workflows that define exploration scope.
4. Navigate the target application using Playwright MCP: Navigate, Snapshot, Click, Fill, Hover, Keyboard, Wait, DOM Inspection, Accessibility Tree, Screenshot.
5. Record locators, navigation flow, controls (tables, forms, buttons, dropdowns, dialogs), and observed validation messages.
6. Write `exploration.md` and `screenshots/`.

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
