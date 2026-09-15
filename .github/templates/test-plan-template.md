# test-plan.md - Artifact Contract

Produced by: Test Plan Generator (or Input Normalizer, for the `manual-test-case` route)
Consumed by: The Existing Automation/Index step, `playwright-browser-exploration`, `test-case-documenter`

This file is the single, authoritative story-level artifact covering what should be tested and whether it's sound to build on - it replaces the former separate `test-design.md`/`test-design.json` and `test-validation.md`/`test-validation.json` artifacts, which no longer exist. It is derived from the story content (Jira story, direct story text, or a supplied manual test case) and `index/framework-profile.json` only - never from a live browser/API session.

---

## Acceptance Criteria

<!-- List each AC-# from the story content, in order. Every AC-# must be either covered by a scenario below or listed as a documented gap with a reason. -->

## Positive Scenarios

<!-- Each scenario has: a stable Scenario ID (SC-###), a trace to an Acceptance Criterion (AC-#), a title, priority (P1/P2/P3), preconditions, test data/dependencies, steps (technology-neutral - no locators, no API call syntax), expected result, and an automation-scope classification (automation candidate / manual candidate / unclear) with a one-line, substantive reason. -->

## Negative Scenarios

<!-- Same structure as Positive Scenarios - only where the requirement calls for one. -->

## Boundary Scenarios

<!-- Same structure as Positive Scenarios - only where applicable. -->

## Priority

<!-- Priority assignment per Scenario ID (P1/P2/P3) and rationale, if not already stated per-scenario above. -->

## Test Data / Dependencies

<!-- Consolidated data needs and cross-scenario dependencies across all scenarios, with source references where already available (e.g. "source: utils/testDataUtils.json"). Anything unresolved is recorded as "Test data dependency unresolved." rather than invented. -->

## Automation Scope

<!-- Summary: which Scenario IDs are automation candidates, manual candidates, and unclear, each with its one-line reason. -->

## Execution Order

<!-- The order in which scenarios/groups should run, and why (e.g. setup dependencies). -->

## Risk Areas

<!-- Only risks actually supported by story/framework evidence - not a boilerplate list. -->

## Gaps / Limitations

<!-- Any AC-# with zero scenarios, with the reason it was intentionally left uncovered. Any honest limitation this plan could not establish (e.g. "framework profile unavailable"). -->

## Environment

<!-- Target environment(s), browsers, roles/personas, and any environment-specific constraints. -->
