# Pipeline State

## Purpose

Let the pipeline **resume from the last valid checkpoint instead of repeating expensive work** - especially MCP browser exploration, the single most expensive step in the whole pipeline. One story-scoped state file records which stages actually completed (artifact exists AND validates - never "the agent started it"), which is running, which failed or is blocked, and what can be safely skipped on the next invocation.

This is plumbing, not a Skill in the "produces a reasoned artifact" sense (contrast `test-plan-generator`). It is a shared utility ([state.js](state.js)) every agent calls at existing Skill boundaries - no agent or Skill implements its own state logic, and the orchestrator is not redesigned to own it. `pipeline-state.json` is internal checkpoint/resume state only, never one of the three story artifacts (`test-plan.md`, `exploration.md`, `test-cases.md`).

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
  "story": "PROJ-1234",
  "status": "NOT_STARTED | IN_PROGRESS | COMPLETED | FAILED | BLOCKED",
  "currentStage": "reuse-check",
  "stages": {
    "<stage-name>": {
      "status": "NOT_STARTED | IN_PROGRESS | COMPLETED | FAILED | SKIPPED | BLOCKED",
      "validatedAt": "ISO timestamp (COMPLETED only)",
      "inputHash": "sha256 of the declared upstream artifact at completion time (invalidation key)",
      "detail": "the stage's own sub-status label, when applicable",
      "reason": "for SKIPPED/BLOCKED - why"
    }
  },
  "reuse": { "decision": "REUSE|PARTIAL|EXPLORE or FULL_REUSE|PARTIAL_REUSE|NO_REUSE", "coverage": 0-100 },
  "timestamps": { "created": "ISO timestamp" },
  "errors": [{ "stage": "...", "at": "...", "message": "..." }]
}
```

`inputHash`/`validatedAt`/`detail`/`reason` exist because they're what the Checkpoint and Invalidation rules actually need to function, and `reuse` accepts either the UI hook's REUSE/PARTIAL/EXPLORE vocabulary or API Capability Discovery's FULL_REUSE/PARTIAL_REUSE/NO_REUSE, since both feed the same field.

See [pipeline-state.schema.json](../../schemas/pipeline-state.schema.json).

## Pipeline Stages

Nine stages, each with `NOT_STARTED`/`IN_PROGRESS`/`COMPLETED`/`FAILED`/`SKIPPED`/`BLOCKED`, matching the simplified Qatalyst pipeline (Jira Story → Test Plan → Existing Automation/Index → Exploration → Test Cases → Test Script):

| Stage | Checkpoint artifact | Depends on (invalidation input) |
|---|---|---|
| `framework-discovery` | `index/framework-profile.json` exists, has `language` + `signature` | - |
| `test-plan` | `test-plan.md` exists, non-empty, has a heading | - |
| `reuse-check` | No persisted artifact - `pipeline-state.json`'s own `reuse` field has a `decision`. Only ever `COMPLETED` via an explicit `checkpoint(slug, 'reuse-check', { decision, coverage })` call, never re-derived from a file on disk (see Checkpoint Rule). | `test-plan.md` |
| `exploration` | `exploration.md` exists, non-empty | - |
| `test-cases` | `testcases.json` exists, `testCases` is a non-empty array | `exploration.md` |
| `test-script` | `tests/` (per-slug) contains at least one file | `testcases.json` |
| `execution` | *reserved slot - no Runner exists yet* | - |
| `healing` | *reserved slot - not wired to Test Healer yet* | - |
| `reporting` | *reserved slot - no Report Analyst yet* | - |

The last three are real entries in `STAGE_ORDER`/the schema but have no checkpoint logic - `state.js` never marks them anything but `NOT_STARTED`, honestly, rather than fabricating completion criteria for stages that don't exist yet.

**`story-analysis`, `test-architecture`, `test-validation`, and `capability-discovery` no longer exist as stages.** The simplified pipeline no longer persists `requirements.md`, `test-design.json`, or `test-validation.json` - the design and validation work they represented is now internal reasoning inside `test-plan-generator`, reported as part of `test-plan.md` itself, not a separate checkpointed stage. `capability-discovery` is renamed `reuse-check` and no longer has a persisted artifact (`reuse-decision.json`/`api-reuse-decision.json` are retired) - its decision is recorded directly into `state.reuse` instead.

## Checkpoint Rule

A stage becomes `COMPLETED` **only** via `evaluateStage()` re-checking its actual state - for every stage except `reuse-check`, that means the declared artifact on disk; never by an agent merely announcing it started. `reuse-check` is the one exception, by design: it has no artifact, so its `COMPLETED` status comes only from an explicit `checkpoint(slug, 'reuse-check', { decision, coverage })` call, which writes `state.reuse` first and then re-evaluates against that.

## Resume Logic

`resumePlan(slug)`:
1. Read `pipeline-state.json`.
2. For each stage in order: if stale (see Invalidation), reset it and cascade-invalidate downstream; otherwise, if `COMPLETED` or `BLOCKED`, re-evaluate against the current state (never blindly trust old state - a blocker may now be resolved, or vice versa).
3. `nextStage` = the first stage that is neither `COMPLETED` nor `SKIPPED`.
4. Overall `status` = `BLOCKED` if any stage is `BLOCKED` (in practice, only `test-plan` can block today, via `test-plan-generator`'s internal quality gate), else `IN_PROGRESS`/`COMPLETED` based on whether `nextStage` exists.

## Invalidation

Lightweight, linear, not a dependency graph: each stage records a `inputHash` (SHA-256 of its one declared upstream artifact) at completion time. On resume, if that upstream artifact's current hash differs, the stage resets to `NOT_STARTED` and every `COMPLETED` stage strictly after it in `STAGE_ORDER` is also reset - the pipeline is linear, so "everything after an invalidated stage might depend on it" is a reasonable, cheap approximation without building real dependency tracking.

Example: editing `test-plan.md` invalidates `reuse-check` (hash-linked to it directly) while `framework-discovery` stays `COMPLETED` untouched.

## BLOCKED Behavior

Recorded exactly as specified: `state.status = 'BLOCKED'`, `state.currentStage` set to the blocking stage, and nothing after it is touched - `checkpoint()`'s `BLOCKED` path returns immediately without calling `advanceCurrentStage()`.

## FAILED Behavior

`checkpoint(slug, stage, { status: 'FAILED', error })` records `{ stage, at, message }` in `state.errors[]` and sets that one stage's entry to `FAILED` - it never touches or overwrites an earlier stage's `COMPLETED` entry.

## SKIPPED Behavior

`checkpoint(slug, 'exploration', { status: 'SKIPPED', reason: '...' })` - distinct from `FAILED`, carries a `reason` (e.g. `"FULL_REUSE (reuse-check decision) - no MCP exploration required"`), and `currentStage` still advances past it, exactly like a `COMPLETED` stage would.

## MCP Reuse Behavior

`state.reuse` records the reuse-check decision (`{ decision, coverage }`) and survives a restart in `pipeline-state.json` on disk. On resume, if `reuse-check` is still `COMPLETED` (not invalidated - its input, `test-plan.md`, hasn't changed) and `exploration` is `SKIPPED`, the invoking agent reads that straight from state and never launches MCP again - this whole mechanism is synchronous state bookkeeping; MCP is a tool the *agent* would call, and the state explicitly tells it not to for a skipped stage.

## Integration

Each existing agent checkpoints at the Skill boundaries it already has - no agent redesign:

- `ui-automation-specialist.agent.md` / `api-automation-specialist.agent.md`: after each Skill's "Verify Output" step, call `checkpoint(slug, stageName)`. Before invoking a Skill, call `resumePlan(slug)` (or trust the agent's own existing "Skip If Valid" artifact check, which `evaluateStage()` formalizes into a written record) to decide whether to skip it. For `reuse-check`, call `checkpoint(slug, 'reuse-check', { decision, coverage })` immediately after the Existing Automation/Index step computes its decision - there is no artifact to re-check, only the explicit call.
- `central-automation-orchestrator.agent.md`: unchanged - it does not own the per-story pipeline and does not need pipeline-state awareness.
- `test-plan-generator`'s internal quality-gate `BLOCKED` result (the agent's own "never proceed past BLOCKED" rule) is durable across a restart via `pipeline-state.json`, not just enforced within a single run.

## Git / Artifacts

`pipeline-state.json` is story-scoped runtime state, not framework metadata - it lives under `artifacts/<slug>/`, which is `.gitignore`d by the existing `artifacts/*` rule. `.gitignore` was not modified - no exception was needed or added.

## What This Utility Must NOT Do

- Must NOT mark a stage `COMPLETED` without re-checking its artifact on disk.
- Must NOT silently trust old `COMPLETED`/`BLOCKED` state without revalidating on resume.
- Must NOT build a dependency graph - one declared upstream artifact per stage, linear downstream cascade only.
- Must NOT create one marker file per stage, or any file besides the single `pipeline-state.json`.
- Must NOT overwrite an earlier successful stage's record when a later stage fails.

## Logging

```
[Pipeline State] proj-1234: framework-discovery COMPLETED, test-plan BLOCKED
[Pipeline State] Overall status: BLOCKED - halting before reuse-check
[Pipeline State] Resume: revalidating test-plan.md...
```
