# Pipeline State

## Purpose

Let the pipeline **resume from the last valid checkpoint instead of repeating expensive work** - especially MCP browser exploration, the single most expensive step in the whole pipeline. One story-scoped state file records which stages actually completed (artifact exists AND validates - never "the agent started it"), which is running, which failed or is blocked, and what can be safely skipped on the next invocation.

This is plumbing, not a Skill in the "produces a reasoned artifact" sense (contrast `test-architect`). It is a shared utility ([state.js](state.js)) every agent calls at existing Skill boundaries - no agent or Skill implements its own state logic, and the orchestrator is not redesigned to own it.

## No Duplicate State System - What Was Checked First

Before writing anything, every hook was inspected for an existing state/completion-marker mechanism:

- `01_repository-sync.hook.md` / `02_workspace-validation.hook.md` - Git and directory-structure health checks, not pipeline progress.
- `08_execution-summary.hook.md` - a **post-hoc** report (`execution-summary.md`) written after a run completes; historical record, not live/resumable state.
- `09_error-handler.hook.md` - a **reactive** append-only `error-log.md`; useful context for `pipeline-state.json`'s `errors[]` array, but not itself a state/resume mechanism.
- `10_cleanup.hook.md` - end-of-run archiving.

None track "which stage completed, is running, or can be resumed." This is genuinely new, not a second implementation of something that already existed.

## State Location

One file per story: `artifacts/<slug>/pipeline-state.json`. No `.agent-01-complete`-style markers, no database.

## State Schema

```json
{
  "story": "KAN-1",
  "status": "NOT_STARTED | IN_PROGRESS | COMPLETED | FAILED | BLOCKED",
  "currentStage": "capability-discovery",
  "stages": {
    "<stage-name>": {
      "status": "NOT_STARTED | IN_PROGRESS | COMPLETED | FAILED | SKIPPED | BLOCKED",
      "validatedAt": "ISO timestamp (COMPLETED only)",
      "inputHash": "sha256 of the declared upstream artifact at completion time (invalidation key)",
      "detail": "the stage's own sub-status, e.g. test-validation's PASS/PASS_WITH_WARNINGS/BLOCKED",
      "reason": "for SKIPPED/BLOCKED - why"
    }
  },
  "reuse": { "decision": "REUSE|PARTIAL|EXPLORE or FULL_REUSE|PARTIAL_REUSE|NO_REUSE", "coverage": 0-100 },
  "timestamps": { "created": "ISO timestamp" },
  "errors": [{ "stage": "...", "at": "...", "message": "..." }]
}
```

Matches the shape in your prompt closely; not a blind copy - `inputHash`/`validatedAt`/`detail`/`reason` were added because they're what the Checkpoint and Invalidation rules actually need to function, and `reuse` accepts either the UI hook's REUSE/PARTIAL/EXPLORE vocabulary or API Capability Discovery's FULL_REUSE/PARTIAL_REUSE/NO_REUSE, since both feed the same field.

See [pipeline-state.schema.json](../../schemas/pipeline-state.schema.json).

## Pipeline Stages

Ten stages, matching your list exactly, each with `NOT_STARTED`/`IN_PROGRESS`/`COMPLETED`/`FAILED`/`SKIPPED`/`BLOCKED`:

| Stage | Checkpoint artifact | Depends on (invalidation input) |
|---|---|---|
| `story-analysis` | `requirements.md` exists, non-empty, has a heading | - |
| `framework-discovery` | `artifacts/indexes/framework-profile.json` exists, has `language` + `signature` | - |
| `test-architecture` | `test-design.json` exists, schema-valid against `test-design.schema.json` | `requirements.md` |
| `test-validation` | `test-validation.json` exists, `status` is one of PASS/PASS_WITH_WARNINGS/**BLOCKED is NOT a completed stage** - see Checkpoint Rule | `test-design.json` |
| `capability-discovery` | `reuse-decision.json` or `api-reuse-decision.json` exists, has a decision field | `test-design.json` |
| `exploration` | `exploration.md` exists, non-empty | `reuse-decision.json` |
| `test-generation` | `tests/` (per-slug) contains at least one `.spec.js` | `testcases.json` |
| `execution` | *reserved slot - no Runner exists yet (out of scope, per Prompt 5's instructions)* | - |
| `healing` | *reserved slot - not wired to Test Healer yet* | - |
| `reporting` | *reserved slot - no Report Analyst yet* | - |

The last three are real entries in `STAGE_ORDER`/the schema (the state model supports all ten, as required) but have no checkpoint logic - `state.js` never marks them anything but `NOT_STARTED`, honestly, rather than fabricating completion criteria for stages that don't exist yet.

## Checkpoint Rule

A stage becomes `COMPLETED` **only** via `evaluateStage()` re-checking its actual artifact on disk - never by an agent merely announcing it started. Schema validation for `test-design.json` reuses [test-validator/validate.js](../test-validator/validate.js)'s `validateAgainstSchema()` directly (`require('../test-validator/validate.js')`) - not a second schema checker.

**Critical subtlety, found via real testing against KAN-1's actual BLOCKED `test-validation.json`**: a well-formed `test-validation.json` whose `status` is `BLOCKED` is *not* a completed stage, even though the JSON itself parses and validates fine. `evaluateStage()` distinguishes "artifact is well-formed" from "the pipeline may proceed": `test-validation`'s validator returns `blocked: true` in that case, which `evaluateStage()` turns into a `BLOCKED` stage entry (not `COMPLETED`), and `checkpoint()`/`resumePlan()` propagate that into `state.status = 'BLOCKED'` without touching `currentStage`. This was an actual bug caught while validating TEST 2 against real data, not a hypothetical - see Validation below.

## Resume Logic

`resumePlan(slug)`:
1. Read `pipeline-state.json`.
2. For each stage in order: if stale (see Invalidation), reset it and cascade-invalidate downstream; otherwise, if `COMPLETED` or `BLOCKED`, re-evaluate against the current artifact (never blindly trust old state - a blocker may now be resolved, or vice versa).
3. `nextStage` = the first stage that is neither `COMPLETED` nor `SKIPPED`.
4. Overall `status` = `BLOCKED` if `test-validation` is blocked, else `IN_PROGRESS`/`COMPLETED` based on whether `nextStage` exists.

Verified against real KAN-1 state: `story-analysis`, `framework-discovery`, `test-architecture` stay `COMPLETED` (not rerun); `nextStage` correctly resolves to `test-validation` for retry, never advancing to `capability-discovery`.

## Invalidation

Lightweight, linear, not a dependency graph: each stage records a `inputHash` (SHA-256 of its one declared upstream artifact) at completion time. On resume, if that upstream artifact's current hash differs, the stage resets to `NOT_STARTED` and every `COMPLETED` stage strictly after it in `STAGE_ORDER` is also reset - the pipeline is linear, so "everything after an invalidated stage might depend on it" is a reasonable, cheap approximation without building real dependency tracking.

Verified: editing `requirements.md` correctly invalidates `test-architecture` and `test-validation` (both downstream, both hash-linked to it directly or transitively) while `framework-discovery` stays `COMPLETED` untouched - exactly the example in the prompt.

## BLOCKED Behavior

Recorded exactly as specified: `state.status = 'BLOCKED'`, `state.currentStage = 'test-validation'`, and nothing after it is touched - `checkpoint()`'s `BLOCKED` path returns immediately without calling `advanceCurrentStage()`. Verified defensively too: even if an agent mistakenly calls `checkpoint(slug, 'capability-discovery')` after a block, it evaluates to `NOT_STARTED` (no `reuse-decision.json` exists) and does not overwrite the `BLOCKED` overall status.

## FAILED Behavior

`checkpoint(slug, stage, { status: 'FAILED', error })` records `{ stage, at, message }` in `state.errors[]` and sets that one stage's entry to `FAILED` - it never touches or overwrites an earlier stage's `COMPLETED` entry. Verified via TEST 3 below.

## SKIPPED Behavior

`checkpoint(slug, 'exploration', { status: 'SKIPPED', reason: '...' })` - distinct from `FAILED`, carries a `reason` (e.g. `"FULL_REUSE (capability-discovery decision) - no MCP exploration required"`), and `currentStage` still advances past it, exactly like a `COMPLETED` stage would.

## MCP Reuse Behavior

`state.reuse` records the capability-discovery decision (`{ decision, coverage }`) and survives a restart in `pipeline-state.json` on disk. On resume, if `capability-discovery` is still `COMPLETED` (not invalidated - its input, `test-design.json`, hasn't changed) and `exploration` is `SKIPPED`, the invoking agent reads that straight from state and never launches MCP again. Verified in TEST 4 below - zero MCP calls, by construction (this whole mechanism is synchronous state bookkeeping; MCP is a tool the *agent* would call, and the state explicitly tells it not to for a skipped stage).

## Integration

Each existing agent checkpoints at the Skill boundaries it already has - no agent redesign, no new Skill invocations added beyond what Prompts 2-4 already wired in:

- `ui-automation-specialist.agent.md` / `test-generator-api.agent.md`: after each Skill's "Verify Output" step (already part of both agents' existing per-Skill loop), call `checkpoint(slug, stageName)`. Before invoking a Skill, call `resumePlan(slug)` (or trust the agent's own existing "Skip If Valid" artifact check, which `evaluateStage()` now formalizes into a written record) to decide whether to skip it.
- `central-automation-orchestrator.agent.md`: unchanged - it does not own the per-story pipeline and does not need pipeline-state awareness, consistent with its existing "no pipeline artifact" boundary (see `CLAUDE.md`/agent docs from Prompt 1-4).
- Test Validator's `BLOCKED` gate (already enforced by the agent's own "never proceed past BLOCKED" rule from Prompt 3) is now also durable across a restart via `pipeline-state.json`, not just enforced within a single run.

## Git / Artifacts

`pipeline-state.json` is story-scoped runtime state, not framework metadata - it lives under `artifacts/<slug>/`, which is `.gitignore`d by the existing `artifacts/*` rule (verified via `git check-ignore`, matching how `test-design.json`/`test-validation.json` are already treated for these same slugs). `.gitignore` was not modified - no exception was needed or added.

## What This Utility Must NOT Do

- Must NOT mark a stage `COMPLETED` without re-checking its artifact on disk.
- Must NOT silently trust old `COMPLETED`/`BLOCKED` state without revalidating on resume.
- Must NOT build a dependency graph - one declared upstream artifact per stage, linear downstream cascade only.
- Must NOT create one marker file per stage, or any file besides the single `pipeline-state.json`.
- Must NOT overwrite an earlier successful stage's record when a later stage fails.

## Logging

```
[Pipeline State] kan-1: story-analysis COMPLETED, framework-discovery COMPLETED,
                 test-architecture COMPLETED, test-validation BLOCKED
[Pipeline State] Overall status: BLOCKED - halting before capability-discovery
[Pipeline State] Resume: revalidating test-validation.json...
```
