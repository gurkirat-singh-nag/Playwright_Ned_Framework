# test-design.md - Artifact Contract

Produced by: Test Architect
Consumed by: Test Plan Generator (Skill 3), Test Case Documenter (Skill 4), Intelligent Reuse Enforcement Hook

This file is the technology-neutral test design for one request - what to test, not how to implement it. It is derived from `requirements.md` and `artifacts/indexes/framework-profile.json` only; it never contains locator syntax, API call code, or content from a live browser/API session.

---

## Acceptance Criteria

<!-- List each AC-# from requirements.md verbatim, in order. -->

## Scenarios

<!-- One entry per scenario. Each has: Scenario ID (SC-###), Title, Priority (P1/P2/P3), Type,
     Acceptance Criteria trace (AC-#), Technology (UI/API/both/integration/manual-only),
     Preconditions, Test Data, Steps (technology-neutral), Expected Result,
     Automation Candidate (true/false/unclear) with a one-line reason,
     and an optional Existing Capability Hint (coarse guess only - not a resolved reuse decision). -->

## Coverage

<!-- Which AC-# are covered by at least one scenario, and which are not. -->

## Risks

<!-- Only risks actually supported by requirement/framework evidence - not a boilerplate list. -->

## Test Data

<!-- Consolidated data needs across all scenarios, with source references where already available.
     Anything unresolved is recorded as "Test data dependency unresolved." rather than invented. -->

## Automation / Manual Classification

<!-- Summary: which Scenario IDs are automation candidates, manual candidates, and unclear. -->

## Gaps

<!-- Any AC-# with zero scenarios, with the reason it was intentionally left uncovered. -->

## Limitations

<!-- Honest notes about what this design could not establish, e.g. "framework profile unavailable". -->
