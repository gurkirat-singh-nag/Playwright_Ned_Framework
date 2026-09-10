# Test Plan Generator

## Purpose

Answer **"what should we test, and is it sound enough to build on?"** for one story, in a single step, producing exactly one artifact: `test-plan.md`.

This Skill replaces the former three-Skill chain (Test Architect designs -> Test Validator gates -> Test Plan Generator plans) with one reasoning step, per the simplified Qatalyst pipeline. `test-design.md`/`.json` and `test-validation.md`/`.json` are no longer produced by anything - the design and validation judgment they used to carry now happens inline, before `test-plan.md` is written, and is reported as part of it rather than as separate persisted artifacts.

## Position In The Pipeline

```
Jira Story (jira-story-analyzer)  /  direct story text or manual test case (input-normalizer)
                              ↓  (structured story content, handed off in-memory - no requirements.md file)
                       TEST PLAN GENERATOR  →  test-plan.md
                              ↓
        Existing Automation / Index step  (read-only check against index/page-objects/*.json)
                              ↓
              playwright-browser-exploration  →  exploration.md   (only for gaps)
                              ↓
                    test-case-documenter  →  test-cases.md, testcases.json
                              ↓
        page-object-generator / test-script-generator
```

Runs once per request, immediately after the story content exists, invoked by whichever agent owns the per-story pipeline (`ui-automation-specialist` today). **Does not run at all for the `manual-test-case` route** - see Scope below; `input-normalizer` produces `test-plan.md` directly for that route instead, since a single fully-specified test case needs no design work.

## Inputs

- Structured story content, handed directly to this Skill by `jira-story-analyzer` or `input-normalizer` (`direct-story-text` route) within the same agent turn - never read from a persisted `requirements.md`, which this pipeline no longer produces.
- `scope.mode` (`"full"` | `"single-scenario"`), `scope.targetScenario` (string | null) - from the Structured Context Package, passed through unmodified by `ui-automation-specialist`. When `scope` is absent, treat it as `{ mode: "full" }`.
- `index/framework-profile.json` (from `framework-discovery` - language, UI/API technology, test runner, architecture).
- Existing `artifacts/<slug>/test-plan.md`, if this request is refining a prior plan.
- `index/page-objects/*.json`, only to note that a scenario is *likely* relevant to existing automation - a coarse, story-level guess, never a resolved reuse decision (see Existing Framework Awareness below).

**`scope.testDefinitionProvided: true` means this Skill does not run at all for this request** - see Scope below.

## Outputs

- `artifacts/<slug>/test-plan.md` only - see [test-plan-template.md](../../templates/test-plan-template.md).

No `test-design.json`/`test-validation.json` machine-readable sidecar is produced. The Existing Automation/Index step (next) parses required actions directly out of `test-plan.md`'s scenario sections.

## What test-plan.md Must Contain

- A requirement / acceptance-criteria summary, each criterion individually referenceable (`AC-#`), carried from the story content.
- Positive scenarios.
- Negative scenarios, where the requirement calls for them.
- Boundary scenarios, where applicable.
- Priority per scenario (P1/P2/P3).
- Test data and dependencies per scenario, and consolidated at the plan level.
- Automation scope per scenario: automation candidate (`true`/`false`/`"unclear"`) with a one-line, substantive reason - not "can be automated."

Every scenario carries a stable Scenario ID (`SC-###`) per [naming.instructions.md](../../instructions/naming.instructions.md).

## Scope-Based Design

### Full Story (`scope.mode: "full"`, or `scope` absent)

Design scenarios for every acceptance criterion in the story content, per Scenario Design Rules and Acceptance Criteria Traceability below.

### Single Scenario (`scope.mode: "single-scenario"`)

Design **only** the one scenario identified by `scope.targetScenario`. Do not design scenarios for any other acceptance criterion, add additional scenarios of any kind beyond the one requested, or silently substitute a different scenario than the one named.

**Resolving `scope.targetScenario`**: it may arrive as an existing scenario name, description, or another clear natural-language identifier - never assume it is already an `SC-###`/`AC-#` ID. Use the story content to resolve it to the specific acceptance criterion/behavior it refers to.

- If it resolves unambiguously, design that one scenario following every other Execution Rule below exactly as for any other scenario.
- If it **cannot** be resolved unambiguously, **stop and report the ambiguity** - name what was searched for and why it didn't resolve to exactly one match. Do not guess the closest match, and do not fall back to designing the full story.

### Test Definition Already Provided (`scope.testDefinitionProvided: true`)

**This Skill does not run.** A complete test definition already exists; `input-normalizer` writes `test-plan.md` directly from it (see [input-normalizer/README.md](../input-normalizer/README.md)) without re-designing it. If this Skill is invoked anyway with `testDefinitionProvided: true` set, stop immediately and report the misroute.

## Execution Rules

1. Check `scope.testDefinitionProvided`. If `true`, stop - do not run; this path belongs to `input-normalizer`.
2. Confirm story content exists. If missing, stop and report the blocker - do not invent it.
3. Read `framework-profile.json` if present; note `uiFramework`/`apiFramework`/`testRunner`/`architecture` for each scenario's technology classification. If absent, classify per requirement evidence alone and record `"framework profile unavailable"` as a limitation.
4. Extract acceptance criteria from the story content (`AC-1`, `AC-2`, ... reusing whatever identifiers already exist there, formalizing `AC-#` in order when the source is unnumbered prose).
5. Determine scope per Scope-Based Design above.
6. For each acceptance criterion in scope, design only the scenarios relevant to it (Scenario Design Rules below).
7. Assign each scenario a stable `SC-###` id.
8. Classify each scenario's automation scope (Automation Suitability below).
9. Identify test data per scenario (Test Data below).
10. Compute coverage: which acceptance criteria in scope have at least one scenario; flag any that don't as a documented gap with a reason.
11. **Self-check before writing** (replaces the former Test Validator gate - see Internal Quality Gate below). If the self-check surfaces a blocking problem, stop and report it instead of writing an unsound `test-plan.md`.
12. Write `test-plan.md`. Do not call any MCP tool, browser, or live API while doing any of this.

## Scenario Design Rules

This Skill's job is to answer **"what scenarios are required to verify the behavior described in this Jira story?"** - never "what would be good general regression coverage for this application?" The Jira story and its acceptance criteria are the sole source of truth for scenario scope.

1. Generate scenarios only from behavior explicitly stated in the Jira story or acceptance criteria.
2. A scenario may also be included when it is strictly necessary to demonstrate that a specific stated acceptance criterion has been satisfied.
3. Do NOT add scenarios simply because they represent generally recommended testing practice.
4. Do NOT expand the story into broad regression coverage.
5. Do NOT add scenarios for existing functionality that the story does not modify, describe, or require.
6. Do NOT automatically add negative, boundary, validation, authentication/authorization, alternate-flow, integration, or data-validation scenarios. Include such a scenario ONLY when the story explicitly requires it or it is strictly necessary to verify a stated acceptance criterion.
7. Existing functionality may be used as a prerequisite or supporting step when necessary to reach or verify the behavior under test. That supporting functionality must NOT become an independent test scenario unless the story explicitly requires it. Example: logging in may be used as a step to reach "Apply Leave." Logout must NOT become a separate scenario for an Apply Leave story unless the story explicitly requires logout behavior.
8. Do NOT create scenarios for functionality merely because it is reachable from the feature or flow described in the story.
9. Do NOT combine multiple independent behaviors or features into a new end-to-end scenario unless the Jira story explicitly describes that combined flow, or the combined flow is strictly necessary to verify a stated acceptance criterion.
10. Every scenario must have a meaningful traceability relationship to the actual content of its linked acceptance criterion (see Acceptance Criteria Traceability below).
11. Do NOT create an invented scenario first and then attach it to the nearest acceptance criterion merely to satisfy a traceability requirement.
12. Automation suitability must NOT expand test scope. A scenario must not be included merely because it is easy to automate, existing automation makes it convenient, it has potential regression value, it is reachable through an existing workflow, or it would provide additional general coverage (see Automation Suitability below).
13. If the story contains only one clearly defined behavior, do not manufacture additional scenarios just to produce a broader or more complete test plan.
14. Prefer the smallest set of scenarios that provides sufficient coverage of the behavior and acceptance criteria explicitly described in the story.

These rules narrow which scenarios may exist - they do not remove any legitimate scenario type. A negative, boundary, validation, authentication/authorization, alternate-flow, integration, or data-validation scenario is still fully valid whenever the story or a stated acceptance criterion actually requires it; the only change is that such a scenario must be driven by the story's actual content, never by generic testing practice.

In single-scenario mode, these rules describe how to design the one requested scenario - not which additional scenarios to add around it.

### Scope Decision Rule

Before creating each scenario, this Skill must be able to answer: **"Which exact requirement or acceptance criterion requires this scenario?"** If there is no clear answer, the scenario MUST NOT be created. A scenario must not be justified by generic testing knowledge alone.

### Existing Functionality / Regression Rule

"Existing functionality regression" is not a general scenario category. Regression testing may be included ONLY when:

- the Jira story explicitly identifies a regression requirement/risk, OR
- exercising existing functionality is strictly necessary to verify a stated acceptance criterion.

Do NOT interpret "regression" as permission to test unrelated existing functionality - see rule 7 above for the login/logout example.

## Automation Suitability

For every scenario that already satisfied the Scenario Design Rules above, set an automation-scope classification to one of `true` (automation candidate), `false` (manual candidate), or `"unclear"`, plus a one-line `reason`. Consider only repeatability/determinism, test-data availability, environment dependencies, and technical feasibility given the detected framework. This classification never expands which scenarios exist - it is applied only after Scope Decision Rule and Scenario Design Rules 1-11 have already admitted the scenario. Regression value, automation convenience, or existing-automation reachability are never valid reasons to classify a scenario `true`, and never a valid reason to have included it in the first place (rule 12). Do not default everything to `true`.

## Test Data Identification

List concrete data needs per scenario and consolidated at the plan level: identifiers, dates, payload shape, expected response shape.

- If the data already exists in the story content, `utils/testDataUtils.json`, or another referenced artifact, reference it rather than repeating literal values that could drift.
- Never invent credentials or secrets. Record an unresolved dependency as `"Test data dependency unresolved."` rather than fabricating a value.

## Acceptance Criteria Traceability

Traceability is a **scope constraint**, not just a documentation requirement - it exists to keep out scenarios that don't belong, not merely to label the ones that already exist.

For every scenario:

- Identify the specific acceptance criterion(s) that require the scenario.
- Ensure the scenario's behavior is actually derived from the content of those acceptance criteria - reference at least one real `AC-#` from the story content, and only an `AC-#` whose actual text describes or entails this scenario's behavior.
- Do not associate a scenario with an acceptance criterion merely because the scenario is related to the same application, page, session, workflow, or feature area as that criterion.

Every `AC-#` must appear in `test-plan.md` as either covered by >=1 scenario or listed as a documented gap with a reason. An acceptance criterion with zero scenarios and zero justification is a defect in the plan, not an acceptable output.

## Internal Quality Gate

The reasoning that used to belong to a separate Test Validator now happens here, inline, before `test-plan.md` is written - never as a second persisted artifact:

- **Completeness/traceability**: every AC covered or gapped-with-reason (see above).
- **Scenario quality**: reject vague scenarios ("Test login.") - a scenario needs a title naming the specific behavior, concrete steps, and a checkable expected result.
- **Duplicate/overlapping scenarios**: if two scenarios describe near-identical behavior without a stated reason both are needed, merge them or document why both exist - never write both silently.
- **Automation feasibility**: every automation-scope `reason` must be substantive (see Automation Suitability above) - "unclear" with no explanation is itself a defect.
- **Test data**: no automation-candidate scenario left depending on an unresolved credential/value without flagging it (see Test Data Identification above).
- **Technology consistency**: a scenario needing UI or API automation when `framework-profile.json` reports `"none"`/`"unknown"` for that surface is a limitation to record, not something to silently pass over.

If any of the above surfaces a problem serious enough to make the plan unsafe to build automation from (zero scenarios, an AC with no coverage and no justification, a fabricated value), **stop and report the blocker** to the invoking agent instead of writing an incomplete or unsound `test-plan.md` - this is the one hard stop this Skill introduces, in place of the former Test Validator's `BLOCKED` status. A plan with minor, non-blocking observations (e.g. a noted limitation) is still written, with those observations included in `test-plan.md`'s own content - not filed as a separate report.

## Existing Framework Awareness

`test-plan.md` may note that a scenario **looks like** it maps to an existing capability - e.g. `"Likely reusable: login capability"` - as a coarse hint. **It must NOT itself search `index/page-objects/*.json` for exact method/class matches or compute a reuse percentage or REUSE/PARTIAL/EXPLORE decision** - that is the Existing Automation/Index step's job, immediately after this Skill (see [02.5_intelligent-reuse-enforcement.hook.md](../../hooks/02.5_intelligent-reuse-enforcement.hook.md)). This Skill must also never create, update, or otherwise touch any file under `index/` - the index is entirely developer-maintained.

## UI / API Independence

Describe scenarios in business/behavioral language, never implementation syntax (no locator syntax, no API call code). Implementation belongs to `page-object-generator`/`test-script-generator` (UI) or the API generator Skills.

## What This Skill Must NOT Do

- Must NOT generate automation code, locators, or API request code.
- Must NOT launch Playwright MCP, open a browser, take a screenshot, inspect a live DOM, call a live API, or fetch a Swagger/OpenAPI document.
- Must NOT perform deep capability discovery (exact class/method matching, coverage percentages) or determine REUSE/PARTIAL/EXPLORE - that belongs entirely to the Existing Automation/Index step.
- Must NOT create, update, regenerate, or validate any file under `index/` - the index is entirely developer-maintained.
- Must NOT invent acceptance criteria, test data, secrets, or risks not supported by evidence.
- Must NOT optimize for scenario count over acceptance-criteria coverage, business-risk coverage, and traceability.
- Must NOT invent scenarios for functionality not explicitly required by the Jira story.
- Must NOT create generic regression scenarios.
- Must NOT expand a story into general regression coverage.
- Must NOT use "good testing practice" as justification for adding scenarios outside the stated story scope.
- Must NOT add negative, boundary, validation, alternate-flow, integration, or other special-case scenarios unless required by the story or strictly necessary to verify a stated acceptance criterion.
- Must NOT create independent scenarios for unrelated existing functionality merely because that functionality is reachable during the story's flow.
- Must NOT combine unrelated functionality into a new end-to-end scenario unless explicitly required by the story.
- Must NOT create additional scenarios simply to make the test plan appear more comprehensive.
- Must NOT use automation convenience or regression value as justification for expanding scenario scope.
- Must NOT silently write a plan that fails its own Internal Quality Gate in a blocking way - stop and report instead.
- Must NOT produce `test-design.json`, `test-validation.json`, or any other persisted artifact besides `test-plan.md`.
- In single-scenario mode: must NOT design unrelated acceptance criteria, add scenarios beyond the one requested, or silently substitute a different scenario.
- Must NOT run at all when `scope.testDefinitionProvided: true`.

## Failure Handling

- Story content missing: stop, report the blocker.
- `framework-profile.json` missing: proceed; record the limitation in `test-plan.md`.
- An acceptance criterion too vague to design a scenario for: list it as a documented gap, do not invent behavior.
- `scope.mode: "single-scenario"` and `scope.targetScenario` cannot be resolved unambiguously: stop, report the ambiguity.
- Internal Quality Gate surfaces a blocking problem: stop, report exactly what and why - do not write the plan.
- `scope.testDefinitionProvided: true`: do not run - report that this request belongs to `input-normalizer`.

## Logging

```
[Test Plan Generator] Read story content (8 acceptance criteria)
[Test Plan Generator] Designed 6 scenarios (4 positive, 1 negative, 1 boundary) covering 7/8 acceptance criteria
[Test Plan Generator] Automation candidates: 5, manual: 1
[Test Plan Generator] Gaps: AC-6 (no distinct scenario - overlaps AC-5)
[Test Plan Generator] Internal quality gate: no blockers, 1 limitation noted
[Test Plan Generator] ✓ test-plan.md written
```
