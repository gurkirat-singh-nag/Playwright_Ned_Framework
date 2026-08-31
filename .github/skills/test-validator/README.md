# Test Validator

## Purpose

Answer **"is this test design safe to build automation from?"** - a gate between Test Architect and everything downstream (capability discovery, exploration, generation). It checks `test-design.json` for completeness, traceability, internal consistency, relevance, non-duplication, automation feasibility, and evidence support, and reports a pass/warn/block verdict the invoking agent must honor.

This Skill is a hybrid, unlike its neighbors: half of it is deterministic and code-backed ([validate.js](validate.js) - JSON/schema integrity, duplicate scenario IDs, AC cross-references, near-duplicate titles, technology-vs-framework-profile consistency, existing-capability awareness, unresolved test data), because those checks are objectively answerable from the artifacts on disk. The other half - scenario quality judgment, requirement-consistency reasoning, risk-quality review - requires reading prose and is applied by the invoking agent per the rules below, the same way Test Architect's own reasoning is applied. Run `validate.js` first; it produces the bulk of `issues[]` and a starting `status`; the invoking agent then adds any findings from the reasoning-only categories (5b, 7, 9 below) before finalizing `test-validation.json`.

## No Duplicate Architecture - What Was Reused

Before writing anything, the existing hooks were inspected:

- **`.github/hooks/04_duplicate-detection.hook.md`** targets *code-level* duplication (Page Objects, methods, generated files) via a `.github/reuse-catalog.json` that doesn't exist and a v1 `artifacts/class-index.json` path this repo no longer has (superseded by `artifacts/indexes/classes/` - see [Prompt 1's rebuild](../../capabilities/generator.js)). It is itself unimplemented/stale and solves a different problem than scenario-text duplication. Test Validator's Category 3 (below) is a genuinely new check - no existing scenario-level duplicate detector existed to reuse - but it reuses that hook's *technique* (Jaccard token similarity, exact/near-duplicate thresholds) rather than inventing a different one.
- **`.github/hooks/05_artifact-validation.hook.md`** is the real "artifact validator" - general JSON/Markdown schema and completeness checking. Test Validator's Artifact Integrity category (10) is a direct application of that same responsibility, scoped to `test-design.json` (against [test-design.schema.json](../../schemas/test-design.schema.json)) and any other artifact present for the slug (e.g. `testcases.json` against `testcases.schema.json`) - not a second, parallel schema-validation mechanism.
- **`.github/capabilities/validator.js` and `search-simplified.js`** (the "capability validator") are reused directly by `validate.js` for Category 8 (Existing Automation Awareness) - it calls `ClassIndexSearch.analyzeReuseCoverage()` read-only, for an informational per-scenario support label. It never computes or returns a REUSE/PARTIAL/EXPLORE decision - that stays `02.5_intelligent-reuse-enforcement.hook.md`'s job.
- **`.github/hooks/06_output-quality-validation.hook.md`** validates *generated code* (Page Objects, specs) after generation - a different artifact type at a different pipeline stage. No overlap.

No "framework validator" existed for checking a scenario's `technology` field against `framework-profile.json` - Category 6 is new logic, kept intentionally small.

## Position In The Pipeline

```
Test Architect  →  test-design.md, test-design.json
                              ↓
                     TEST VALIDATOR  →  test-validation.md, test-validation.json
                              ↓
                    status = BLOCKED?  →  STOP, return findings to the invoking agent
                    status = PASS / PASS_WITH_WARNINGS  →  continue
                              ↓
   02.5_intelligent-reuse-enforcement.hook.md  (capability discovery)
                              ↓
              playwright-browser-exploration  →  exploration.md
                              ↓
                    ... rest of the pipeline unchanged ...
```

Runs once per request, immediately after `test-design.json` exists, inside the same agent that owns the per-story pipeline (`ui-automation-specialist` today). It is not re-invoked per downstream Skill. See [ui-automation-specialist.agent.md](../../agents/ui-automation-specialist.agent.md) for the exact pipeline position and gate wiring.

## Inputs

- `artifacts/<slug>/test-design.json` (primary, required - this Skill cannot run without it)
- `artifacts/<slug>/requirements.md` (for Category 7, requirement consistency)
- `artifacts/indexes/framework-profile.json` (for Category 6, technology consistency)
- `artifacts/<slug>/testcases.json`, if it already exists (Category 10 covers it too - this is exactly what catches `artifacts/kan-1/testcases.json`'s existing corruption)
- `artifacts/indexes/classes/*.json` (via `search-simplified.js`, for Category 8, informational only)
- `artifacts/<slug>/test-validation.json`, if a prior validation run already exists for this slug (treat as context on a resumed pipeline, not as something to silently overwrite without re-checking)

Do not require any input not already part of this pipeline. Missing optional inputs degrade specific categories to a WARNING/INFO note (see `validate.js`'s handling of a missing `framework-profile.json`), never to a hard failure of the whole Skill.

## Outputs

- `artifacts/<slug>/test-validation.md` - human-readable report
- `artifacts/<slug>/test-validation.json` - machine-readable, validated against [test-validation.schema.json](../../schemas/test-validation.schema.json)

Same per-slug directory as every other pipeline artifact - no new artifact root.

## Validation Categories

### 1. Acceptance Criteria Coverage
Every AC must map to at least one scenario that **meaningfully** addresses it - an AC id merely appearing in a scenario's `acceptanceCriteria` array is not sufficient on its own; the invoking agent should read the scenario's `steps`/`expectedResult` against the AC's `text` and confirm they actually correspond. Report each AC as `covered` (a scenario genuinely addresses it), `partial` (addressed but incompletely - e.g. only the happy path of a multi-part AC), or `uncovered`. `validate.js` checks the mechanical part (does the reference exist, is the coverage array internally consistent); the "meaningfully addresses" judgment is the invoking agent's job.

### 2. Scenario Quality
Reject/flag vague scenarios ("Test login.") that don't state what's being verified. A scenario is adequate when it has: a title that names the specific behavior under test, preconditions where the scenario genuinely depends on prior state, steps that are concrete actions (not "do the thing"), an expected result that's checkable, and a stated technology/automation classification. This is reasoning, not code - `validate.js` does not attempt to score prose quality.

### 3. Duplicate / Overlapping Tests
`validate.js`'s `detectDuplicateScenarios()` runs Jaccard token-similarity on scenario titles: ≥90% → `duplicate`, 60-89% → `probable duplicate`, below → not reported. Both report as **WARNING**, never delete anything, and always include a reason. The invoking agent may add a `probable duplicate` finding `validate.js` couldn't catch (e.g. same behavior described in very different words) - text-similarity is a floor, not a ceiling, on this category.

### 4. Test Data Validation
`validate.js` flags scenario-level and consolidated `testData` entries containing "unresolved" text, attributing to a specific automation-candidate scenario (**BLOCKER**) when text-overlap makes that link reasonably clear, otherwise an unattributed **WARNING**. It does not invent replacement data - matching Test Architect's own rule. Secrets: Test Architect already refuses to invent credentials; this category's job is to confirm no scenario's `testData` contains what looks like a literal hardcoded credential value (as opposed to a reference like `"source: utils/testDataUtils.json"`) - flag any as **BLOCKER** (unsafe credential handling).

### 5. Automation Feasibility
Check that `reason` is substantive, not filler. "Can be automated." is not an acceptable reason (**WARNING**); "Deterministic and already supported by an existing Page Object method." is. For `automationCandidate: true`, the reason should cite a concrete technical basis (determinism, existing capability, data availability). For `false`, a concrete blocker. For `"unclear"`, the specific unresolved dependency must be named - "unclear" with no explanation is itself a finding (**WARNING**). `validate.js` does not grade reason quality; this is reasoning applied by the invoking agent.

### 6. Technology Consistency
`validate.js`'s `checkTechnologyConsistency()` compares each scenario's `technology` (UI/API/both/integration/manual-only) against `framework-profile.json`'s `uiFramework`/`apiFramework`: a scenario needing UI or API automation when the profile reports `"none"`/`"unknown"` for that surface is a **WARNING**. Note: Test Architect's `technology` field is deliberately engine-neutral (never says "Playwright" or "Selenium" - see [test-architect/README.md](../test-architect/README.md)'s UI/API Independence rule), so this check operates at the surface level (does *any* UI/API capability exist), not by comparing named engines against each other - there is no engine name in `test-design.json` to compare in the first place.

### 7. Requirement Consistency
Compare scenarios against `requirements.md` directly. Report a **REQUIREMENT / IMPLEMENTATION DISCREPANCY** (WARNING) when a scenario or AC conflicts with evidence elsewhere in the repository - e.g. an AC describing a navigation path or capability that doesn't match what an existing Page Object actually does. **Never silently correct the requirement or the scenario** - report the discrepancy and let a human resolve it. This is exactly the class of finding Test Architect's own `existingCapabilityHint`/risk fields sometimes already surface (see KAN-1's AC-2 and AC-3/AC-4 findings) - the Validator's job here is to confirm those flagged discrepancies are real and to catch any Test Architect missed, not to invent new ones. Reasoning-only; `validate.js` does not read `requirements.md` prose.

### 8. Existing Automation Awareness
`validate.js`'s `checkExistingCapabilityAwareness()` calls `ClassIndexSearch.analyzeReuseCoverage()` per scenario and labels each `appears fully supported` / `appears partially supported` / `no known implementation` as **INFO**. This never launches MCP, never computes a final reuse percentage decision, and never blocks - it's a heads-up for the reader, matching Test Architect's own `existingCapabilityHint` at a slightly higher confidence (an actual index lookup, not a coarse guess) but still not the resolved decision the reuse-enforcement hook makes next.

### 9. Risk Validation
Review Test Architect's `risks[]`. Flag generic/boilerplate risk text not tied to specific evidence (**INFO** - improvement suggestion), risks with no `relatedScenarios` when they plausibly should have one, and - the more important direction - an explicitly risky AC (e.g. one Test Architect's own risk analysis or `requirements.md`'s own Risks section already flagged) that has **no** corresponding risk entry at all (**WARNING** - missing risk coverage). Do not invent new risk categories wholesale; this is a review of what's already there, not a fresh risk-analysis pass.

### 10. Artifact Integrity
`validate.js`'s `checkArtifactIntegrity()`: JSON parse safety (catches malformed JSON as **BLOCKER**, never attempts repair), schema conformance against `test-design.schema.json`, duplicate scenario IDs, AC cross-reference validity, coverage-array consistency, and - critically - the same integrity bar applied to any other artifact already present for the slug, such as `testcases.json`. **This is the check that catches `artifacts/kan-1/testcases.json`'s existing corruption** (a duplicated `testCases` array making the file invalid JSON) as an `ARTIFACT INTEGRITY FAILURE`, reported with file/problem/severity, never silently repaired.

## Severity Model

Three levels only - matching the existing hooks' spirit (`05_artifact-validation.hook.md` uses CRITICAL/WARN/INFO; this Skill uses the terms the orchestrating pipeline already expects for gate behavior):

- **BLOCKER** - invalid JSON/schema, missing AC coverage for a criterion the story clearly depends on, an automation candidate with an impossible/unresolved dependency, unsafe credential handling, a fundamentally broken design (e.g. zero scenarios).
- **WARNING** - unresolved test data (unattributed), probable/likely duplicate, requirement/evidence discrepancy, unclear automation suitability without a stated reason, non-critical missing information.
- **INFO** - improvement recommendation, existing-capability awareness note, optional additional coverage suggestion, maintainability note.

## When Validation Runs

Once per request, immediately after `test-design.json` is produced or reused, before the reuse-enforcement hook runs. Not re-run per downstream Skill. If the pipeline is resumed and a valid `test-validation.json` already exists for an unchanged `test-design.json`, reuse it rather than re-validating - the invoking agent applies the same "skip if valid" rule it uses for every other Skill's artifact.

## What This Skill Must NOT Do

- Must NOT generate Playwright/Selenium/Cypress/RestAssured automation code.
- Must NOT launch Playwright MCP, open a browser, take a screenshot, call a live API, or fetch a Swagger/OpenAPI document. Expected MCP calls: **zero**. Validation is based entirely on artifacts and repository evidence already on disk.
- Must NOT perform full capability discovery (exact class/method matching, a binding reuse percentage/decision) - Category 8 is informational only; the resolved decision stays `02.5_intelligent-reuse-enforcement.hook.md`'s job.
- Must NOT silently repair a malformed artifact (e.g. `testcases.json`) - report it as an artifact integrity failure and let the invoking agent/human decide remediation.
- Must NOT silently correct a requirement or acceptance criterion it believes is wrong - report the discrepancy (Category 7), never rewrite `requirements.md`.
- Must NOT delete or silently merge duplicate scenarios - report `duplicate`/`probable duplicate`/`distinct` with a reason and let a human decide.
- Must NOT invent risks, test data, or acceptable-sounding justifications to make a weak design look passable.
- Must NOT create a second duplicate-detection or schema-validation engine where an existing hook already owns that responsibility conceptually - see No Duplicate Architecture above.

## Gate Behavior

```
status = BLOCKED             → STOP. Do not proceed to capability discovery or generation.
                                Return test-validation.json's issues to the invoking agent/orchestrator.
status = PASS_WITH_WARNINGS  → Continue, but carry the warnings forward in the pipeline context
                                (e.g. surface them again in the final pipeline completion summary).
status = PASS                → Continue normally.
```

The invoking agent must never proceed past a `BLOCKED` status - this is the one hard stop this Skill introduces into the pipeline, matching the existing "Stop on Failure" rule every Skill in `ui-automation-specialist`'s pipeline already follows, applied here specifically to blocker-level validation findings rather than a missing/invalid artifact.

## How Downstream Agents Consume The Result

- `ui-automation-specialist` checks `test-validation.json`'s `status` immediately after this Skill runs, before invoking the reuse-enforcement hook. `BLOCKED` halts the pipeline exactly like any other Skill failure. `PASS_WITH_WARNINGS`'s `issues[]` are carried into the final completion summary so a human sees them even though generation proceeded.
- `02.5_intelligent-reuse-enforcement.hook.md` and `playwright-browser-exploration` are not expected to re-read `test-validation.json` themselves - the gate has already been applied by the time they run.

## Logging

```
[Test Validator] Status: PASS_WITH_WARNINGS
[Test Validator] Blockers: 0, Warnings: 3, Info: 6
[Test Validator] AC coverage: 8/8 covered
[Test Validator] Scenarios: 6 total, 6 valid, 0 duplicates
[Test Validator] ✓ test-validation.md, test-validation.json written
```
