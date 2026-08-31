# Test Architect

## Purpose

Answer **"what should we test?"** for one requirement, before anyone starts answering "how do we implement it?" or "what can we reuse?".

The Test Architect turns `requirements.md` (plus whatever other evidence is available) into a technology-neutral, traceable test design: which acceptance criteria exist, which scenarios cover them, which of those scenarios are worth automating, what test data and risks are involved, and where coverage is genuinely missing.

It is a reasoning/design Skill, the same category as `jira-story-analyzer` and `test-plan-generator` - there is no executable script here, because "what should we test" requires judgment about a specific requirement, not deterministic evidence scanning (contrast with `framework-discovery`, which *is* a script, because "what tech stack exists" is deterministically answerable from files on disk).

## Position In The Pipeline

```
jira-story-analyzer  →  requirements.md
                              ↓
                       TEST ARCHITECT  →  test-design.md, test-design.json
                              ↓
   02.5_intelligent-reuse-enforcement.hook.md  (capability discovery: reuse/partial/explore)
                              ↓
              playwright-browser-exploration  →  exploration.md
                              ↓
        test-plan-generator / test-case-documenter  (may consume test-design.md as primary input)
                              ↓
        page-object-generator / test-script-generator
```

Runs **once per request**, immediately after `requirements.md` exists and before the reuse-enforcement hook. It is invoked by whichever agent owns the per-story pipeline (`ui-automation-specialist` today; `api-automation-specialist` once its Skills are implemented) - not re-invoked per downstream Skill. See [ui-automation-specialist.agent.md](../../agents/ui-automation-specialist.agent.md) for the exact pipeline position.

## Inputs

Consume whatever of the following actually exists for this request - **never assume all of them are present**:

- `artifacts/<slug>/requirements.md` (required - this Skill cannot run without it)
- `artifacts/indexes/framework-profile.json` (from `framework-discovery` - language, UI/API technology, test runner, architecture)
- `artifacts/<slug>/exploration.md`, if a prior partial/full exploration already ran (e.g. on a resumed pipeline)
- Existing `artifacts/<slug>/test-cases.md` / `testcases.json`, if this request is refining a prior design
- An API specification (OpenAPI/Swagger file or URL already provided in `requirements.md` - do not fetch one)
- `index/page-objects/*.json` (class index), only to note that a capability is *likely* relevant - see Existing Framework Awareness below

If something on this list doesn't exist for the current request, proceed without it - do not fail, and do not fabricate its content.

## Outputs

- `artifacts/<slug>/test-design.md` - human-readable design (structure below)
- `artifacts/<slug>/test-design.json` - machine-readable design, validated against [test-design.schema.json](../../schemas/test-design.schema.json)

Both files live in the same per-request `artifacts/<slug>/` directory as every other pipeline artifact - see [artifact-naming.instructions.md](../../instructions/artifact-naming.instructions.md). No new artifact root, no per-story sprawl of extra files.

## Execution Rules

1. Read `requirements.md`. If it does not exist, stop and report the blocker - do not invent requirements.
2. Read `framework-profile.json` if present; note `uiFramework`/`apiFramework`/`testRunner`/`architecture` for the **Technology** field on each scenario (see UI/API Independence below). If absent, mark technology per scenario using only requirement evidence and record `"framework profile unavailable"` as a limitation.
3. Extract acceptance criteria from `requirements.md`'s Acceptance Criteria section (`AC-1`, `AC-2`, ... as numbered/bulleted in that file - reuse whatever identifiers already exist there rather than inventing a new scheme when they're already present, and formalize `AC-#` in that order when the source is unnumbered prose).
4. For each acceptance criterion, design only the scenarios relevant to it, per Scenario Design Rules below.
5. Assign each scenario a `SC-###` id (Scenario ID), reusing the existing pipeline's Scenario ID convention from [naming.instructions.md](../../instructions/naming.instructions.md) - this Skill's scenarios are exactly what `test-plan-generator` currently invents from scratch, so reusing the same ID space keeps `test-plan.md` and `testcases.json` traceable back to this design without a second ID system.
6. Classify each scenario's automation suitability (Automation Suitability below).
7. Identify test data per scenario (Test Data below).
8. Identify risks, but only ones actually supported by evidence (Risk Analysis below).
9. Compute coverage: which acceptance criteria have at least one scenario; flag any that don't as a gap.
10. Write both output files. Do not call any MCP tool, browser, or live API while doing any of this (see MCP Rule below).

## Scenario Design Rules

Consider these categories, but **only include what the actual requirement calls for** - do not generate all eleven for every story:

1. Happy path
2. Negative scenarios
3. Boundary conditions
4. Validation/error scenarios
5. Authentication/authorization
6. Business rule validation
7. Data validation
8. Integration/dependency behaviour
9. State transitions
10. Existing functionality regression
11. Important alternate flows

A requirement with no stated business rules gets no "business rule validation" scenario. A requirement with no multi-step state machine gets no "state transitions" scenario. Padding scenario count to look thorough is the opposite of this Skill's job - see Design Principle below.

## Automation Suitability

For every scenario, set `automationCandidate` to one of `true` (automation candidate), `false` (manual candidate), or `"unclear"`, plus a one-line `reason`. Consider:

- Repeatability and deterministic behaviour (a scenario dependent on random/time-sensitive external state is a weaker candidate)
- Availability of test data (see below)
- Environment dependencies (does it need something not reliably available in the test environment?)
- Technical feasibility given the detected `uiFramework`/`apiFramework`
- Existing framework capability (a scenario matching an existing Page Object method is a stronger candidate)
- Business value and regression value

Do not default everything to `true`. A story with an ambiguous or environment-dependent scenario should produce at least one `false` or `"unclear"` classification when evidence supports it.

## Test Data Identification

List concrete data needs per scenario and consolidated at the design level: user/employee/account/product identifiers, dates, API payload shape, expected response shape.

- If the data already exists in `requirements.md`, `utils/testDataUtils.json`, or another referenced artifact, reference it (e.g. `"source: utils/testDataUtils.json"`) rather than repeating literal values that could drift.
- Never invent credentials or secrets. If a scenario needs authentication data not present anywhere in evidence, record it as `"Test data dependency unresolved."` rather than fabricating a value.

## Acceptance Criteria Traceability

Every scenario's `acceptanceCriteria` array must reference at least one real `AC-#` from `requirements.md`. Every `AC-#` from `requirements.md` must appear in the design's `coverage` block, either as covered by ≥1 scenario or listed under `gaps` with a reason (e.g. "acceptance criterion is UI-copy only, no distinct behavior to test separately from AC-3"). An acceptance criterion with zero scenarios and zero justification is a defect in the design, not an acceptable output.

```
AC-1 "User can successfully log in with valid credentials."
   ↓
SC-001 "Verify successful login with valid credentials."
   ↓
(downstream) TC-### in testcases.json  →  generated spec  →  execution result
```

Test Architect owns the first arrow. `test-case-documenter` and `test-script-generator` own the rest.

## Existing Framework Awareness

Read `framework-profile.json` to know what kind of framework exists (language, UI/API technology, architecture, key directories). This Skill may note that a scenario **looks like** it maps to an existing capability - e.g. `"Likely reusable: login capability"` - as a hint for the next stage.

**It must NOT itself search `index/page-objects/*.json` for exact method/class matches or compute a reuse percentage.** That is the deep-discovery job the reuse-enforcement hook and `ClassIndexSearch.analyzeReuseCoverage()` already own (see [.github/hooks/02.5_intelligent-reuse-enforcement.hook.md](../../hooks/02.5_intelligent-reuse-enforcement.hook.md)). Test Architect's `existingCapabilityHint` field is a coarse, story-level guess, not a resolved reuse decision - conflating the two would duplicate the reuse-enforcement hook's job inside a different Skill.

## UI / API Independence

Describe scenarios in business/behavioral language, never implementation syntax:

- Write: `"Verify customer account is created successfully."`
- Not: `"page.getByRole('button', { name: 'Create' }).click()"` or `"given().post('/accounts')..."`

Per scenario, set `technology` to one of `UI`, `API`, `both`, `integration`, or `manual-only`, based on the requirement's evidence and `framework-profile.json`'s detected `uiFramework`/`apiFramework` (e.g. if `apiFramework` is `"unknown"` and the requirement describes no API surface, no scenario should be classified `API`-only). Implementation syntax belongs entirely to `page-object-generator` / `test-script-generator` (UI) or the future API generator Skills.

## Risk Analysis

Report only risks the requirement or framework context actually supports - not a boilerplate list attached to every story. Typical categories, when evidenced:

- Authentication dependency, environment dependency, external/downstream service dependency
- Unstable or unavailable test data
- Asynchronous processing, state dependency
- Unclear or ambiguous acceptance criterion (cite which one)

If `requirements.md` already has a Risks section (Jira Story Analyzer produces one), treat it as a primary source - don't re-derive what's already been identified; extend it only where the design surfaces something new (e.g. a scenario whose data dependency wasn't visible until scenarios were designed).

## Duplicate / Overlapping Scenarios

If `test-cases.md` or `testcases.json` already exists for this slug (a resumed/refining run), read it as context to avoid re-describing an already-covered scenario under a new ID. This Skill is not, however, responsible for the final duplicate-detection decision - that belongs to the future Test Validator / duplicate-detection layer. When in doubt, note the possible overlap in `gaps` or as a scenario-level comment rather than silently deduping or silently duplicating.

## What This Skill Must NOT Do

- Must NOT generate Playwright/Selenium/Cypress/RestAssured automation code, locators, or API request code.
- Must NOT launch Playwright MCP, open a browser, take a screenshot, inspect a live DOM, call a live API, or fetch a Swagger/OpenAPI document over the network. Reasoning/design only, using evidence already present in artifacts. (If a specific input genuinely requires MCP - e.g. a requirement that only makes sense after seeing the live app - that belongs to `playwright-browser-exploration`, which runs after this Skill; escalate rather than launching MCP here.)
- Must NOT perform deep capability discovery (exact class/method matching, coverage percentages) - see Existing Framework Awareness.
- Must NOT invent acceptance criteria, test data, secrets, or risks not supported by evidence.
- Must NOT optimize for scenario count. Optimize for acceptance-criteria coverage, business risk coverage, meaningful regression coverage, reuse of existing automation, traceability, and maintainability - not AI-generated test-case volume.
- Must NOT make the final duplicate/overlap call (see above) or the final reuse decision (see Existing Framework Awareness) - both are owned elsewhere.

## Failure Handling

- `requirements.md` missing: stop, report the blocker to the invoking agent. Do not produce a design from nothing.
- `framework-profile.json` missing: proceed; every scenario's `technology` classification is then based on requirement evidence alone, and the design records this as a limitation.
- An acceptance criterion is too vague to design a scenario for: do not invent behavior to fill the gap - list it under `gaps` with `"acceptance criterion insufficiently specific to design a scenario"`.

## Logging

```
[Test Architect] Read requirements.md (8 acceptance criteria)
[Test Architect] Read framework-profile.json (uiFramework: Playwright)
[Test Architect] Designed 6 scenarios covering 7/8 acceptance criteria
[Test Architect] Automation candidates: 5, manual candidates: 1
[Test Architect] Gaps: AC-6 (no distinct scenario - overlaps AC-5, see gaps[])
[Test Architect] ✓ test-design.md, test-design.json written
```
