# Input Normalizer

## Purpose

A pure **input transformation** Skill: convert a non-Jira automation request already classified by `central-automation-orchestrator` into the same normalized story content `jira-story-analyzer` would otherwise produce, or - for a fully-supplied manual test case - directly into `test-plan.md`, so that everything downstream never needs to know whether the request originated from Jira, chat, or a pasted manual test case.

It exists because Jira is optional in this scaffold's routing model (see `central-automation-orchestrator.agent.md`'s Structured Context Package and `ui-automation-specialist.agent.md`'s Routing Rules 2/3): something has to normalize the two `inputType` values that aren't Jira-sourced, and `jira-story-analyzer` (Jira/Confluence-only, by its own README) is not the right owner for that.

This Skill performs **structural transformation only**. It never designs scenarios beyond what a supplied test case already states, never classifies feasibility, never searches for reuse, and never explores anything - see "What This Skill Must NOT Do" below.

## When It Should Be Invoked

By `ui-automation-specialist`, in place of `jira-story-analyzer`, exactly when the Structured Context Package's `inputType` is `direct-story-text` or `manual-test-case` (Routing Rules 2 and 3). Never invoked for `jira-story` or `jira-story-scenario` - those remain `jira-story-analyzer`'s job unchanged.

## Inputs

From the Structured Context Package only - never Jira, Confluence, the live application, or any other artifact:

- `inputType`: `direct-story-text` or `manual-test-case`.
- `slug`: for the `artifacts/<slug>/` working directory, per [naming.instructions.md](../../instructions/naming.instructions.md).
- `requirementContent` (when `inputType` is `direct-story-text`): the user's story/requirement text, verbatim.
- `testCaseContent` (when `inputType` is `manual-test-case`): the user's supplied test case - title, steps, expected result, and whatever optional metadata (preconditions, priority, type) was given, verbatim.
- `index/framework-profile.json` - read-only, for the same `technology`/framework context `test-plan-generator` already reads; never re-derived here.

## Outputs

**For `direct-story-text`:** nothing written to disk. `requirementContent` is handed directly to `test-plan-generator` within the same agent turn, exactly as `jira-story-analyzer`'s structured story content would be - `test-plan-generator` cannot tell, and does not need to tell, which Skill supplied it.

**For `manual-test-case`:** `artifacts/<slug>/test-plan.md` - structure defined in [test-plan-template.md](../../templates/test-plan-template.md), containing **exactly one** scenario, derived by direct field mapping from `testCaseContent` (never invention). This is the same artifact `test-plan-generator` produces for every other route - `test-plan-generator` itself does not run for this route (see Path B below), since a single fully-specified test case needs no design work.

## Execution Steps

### Path A: `direct-story-text` → pass-through to Test Plan Generator

1. Read `requirementContent`.
2. Hand it directly to `test-plan-generator`, unmodified, within the same agent turn. This Skill's job ends here - it does not itself produce `test-plan.md`; `test-plan-generator` still runs normally afterward for this route (Routing Rule 2), exactly as it would for Jira-sourced input.

### Path B: `manual-test-case` → `test-plan.md`

1. Check whether `artifacts/<slug>/test-plan.md` already exists and is structurally valid. If so, skip and reuse it.
2. Read `testCaseContent`.
3. Construct **exactly one** scenario by direct field mapping, never invention:
   - `id`: `SC-001` (a new, single-scenario plan - always the first ID in it).
   - Title, steps, expected result: the supplied title/steps/expected result, verbatim.
   - Acceptance criterion: a manual test case has no separate Jira acceptance criteria to point at. This Skill synthesizes exactly one `AC-1` whose text is the supplied expected result, restated as a criterion - a structural necessity, not an invented requirement, since it introduces no information the user didn't already provide.
   - Category: Positive, unless `testCaseContent` states otherwise (e.g. explicitly a negative/boundary case).
   - Priority: mapped directly if supplied (including an obvious equivalent like High/Medium/Low -> P1/P2/P3). **If genuinely absent and not derivable, stop and report it as missing** - do not default a value the user never gave.
   - Automation scope: `automationCandidate: true`, reason: "Automation requested for this supplied test case (`intent: create-automation`, already decided upstream)." This records a decision the orchestrator's context package already made - it is not this Skill independently judging automation suitability.
   - Test data/preconditions: mapped directly from whatever was supplied; omitted if none was.
4. Write `test-plan.md` with this one scenario, following [test-plan-template.md](../../templates/test-plan-template.md)'s structure.
5. If any required field cannot be derived from `testCaseContent` without inventing information (most likely: priority), **stop and report exactly which field is missing**, rather than fabricating a plausible-sounding value.

## What This Skill Must NOT Do

- Must NOT contact Jira or Confluence, under any circumstance.
- Must NOT invoke Playwright MCP, open a browser, or call a live API.
- Must NOT invoke `test-plan-generator` for the `manual-test-case` path - it replaces its output for that one `inputType`, it does not call it. For `direct-story-text`, it does not call `test-plan-generator` either - it hands off content, and `test-plan-generator` runs next in the normal pipeline sequence.
- Must NOT search `index/page-objects/*.json` or any other existing-automation index, and must NOT make a REUSE/PARTIAL/EXPLORE decision - that determination belongs exclusively to the Existing Automation/Index step (see [02.5_intelligent-reuse-enforcement.hook.md](../../hooks/02.5_intelligent-reuse-enforcement.hook.md)), unchanged, running at its normal position after `test-plan.md` exists. `scope.testDefinitionProvided: true` is never treated as evidence that automation already exists.
- Must NOT invent acceptance criteria, scenarios, or test data beyond what the input actually contains. For `manual-test-case`, this means never expanding one supplied test case into multiple scenarios and never adding negative/boundary/alternate-flow coverage the user didn't ask for.
- Must NOT judge automation suitability beyond recording the already-decided `intent`.
- Must NOT create a new schema, weaken an existing one, or invent a new ID scheme - `SC-###`/`AC-#` follow [naming.instructions.md](../../instructions/naming.instructions.md) exactly as every other Skill already does.
- Must NOT write to any location other than `artifacts/<slug>/`, per [artifact-naming.instructions.md](../../instructions/artifact-naming.instructions.md).

## Failure Handling

- `requirementContent`/`testCaseContent` missing or empty for the corresponding `inputType`: stop, report the blocker - do not produce content from nothing.
- A required field cannot be derived without inventing information (e.g. priority absent from a supplied manual test case): stop and name exactly which field is missing - never fabricate a value.

## Retry Strategy

Pure derivation step: retry only transient file read/write errors, up to 3 attempts. A missing required field is never retried - it is reported.

## Logging

Report, every run:
- `inputType` processed.
- Artifact created or reused (`manual-test-case` only), or confirmation content was handed off in-memory (`direct-story-text`).
- Any required information that was missing, named exactly.
- Explicit confirmation that no Jira/Confluence contact, no MCP session, no reuse search, and no browser exploration occurred during this run.

## Relationship To Other Skills

- **`jira-story-analyzer`**: this Skill is its non-Jira counterpart - mutually exclusive `inputType`s, never both invoked for the same request.
- **`test-plan-generator`**: for `manual-test-case`, this Skill's output *substitutes* for it (a single-scenario `test-plan.md`), it does not call it. For `direct-story-text`, `test-plan-generator` still runs normally afterward, consuming this Skill's handed-off content exactly as it would consume `jira-story-analyzer`'s.
- **Existing Automation/Index step**: unchanged and unmodified - it runs after `test-plan.md` exists, at its normal pipeline position, regardless of which Skill produced that file.

## Future Extensions

- Additional `inputType`s as new non-Jira sources are added (e.g. a test-management-tool export) would extend this Skill's input handling, not create a third normalizer Skill.
