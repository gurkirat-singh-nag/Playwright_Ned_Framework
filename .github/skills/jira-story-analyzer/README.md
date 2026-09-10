# Jira Story Analyzer

## Purpose

Retrieve a Jira Story, and any linked Confluence pages, and structure its business content for the invoking agent to hand directly to `test-plan-generator` in the same turn. This is the only Skill in the pipeline permitted to contact Jira or Confluence directly.

Per the simplified Qatalyst pipeline, this Skill does **not** persist a `requirements.md` artifact. Story content is structural working data passed in-memory from this Skill to `test-plan-generator` - it is never one of the three story artifacts (`test-plan.md`, `exploration.md`, `test-cases.md`) and is never written to `artifacts/<slug>/`.

## Inputs

- `sourceReference` - the Jira Story ID or URL, from the Structured Context Package (see `central-automation-orchestrator.agent.md`), used to retrieve the story. Populated for both `inputType: jira-story` and `inputType: jira-story-scenario` - this Skill's behavior is identical either way: retrieve and structure the **complete** Jira story, regardless of which of the two it is.
- Title, Description, Acceptance Criteria, Comments, Attachments (optional) - read directly from the retrieved story.
- Linked Confluence pages (optional).

This Skill does **not** consume `scope.mode` or `scope.targetScenario`, and does not itself distinguish `jira-story` from `jira-story-scenario` - both retrieve and structure the same, full story. Resolving a natural-language `targetScenario` against the resulting story content, and restricting the plan to a single scenario, is `test-plan-generator`'s responsibility - not this Skill's. This Skill never filters, scopes, or selects scenarios from the story it retrieves.

## Outputs

Structured story content, returned directly to the invoking agent (`ui-automation-specialist`) for immediate hand-off to `test-plan-generator` - not a file. Content covers: Story ID/title/source, Description, Acceptance Criteria (individually referenceable, e.g. `AC-1`, `AC-2`), Business Rules, URLs, Test Data, Validation Messages, User Workflows, Assumptions (clearly marked as inferred), and Risks.

## Artifacts Consumed

- None. This Skill is the entry point when the input is Jira-sourced (`inputType: jira-story` or `jira-story-scenario`) - not for every automation request, since Jira is optional in this pipeline (see [input-normalizer/README.md](../input-normalizer/README.md) for the non-Jira entry point covering `direct-story-text` and `manual-test-case`). Among Jira-sourced requests, it remains the only Skill permitted to read Jira/Confluence directly.

## Execution Steps

1. Retrieve the Jira Story and any linked Confluence pages - the complete story, whether `inputType` is `jira-story` or `jira-story-scenario`.
2. Extract and structure content into the categories listed under Outputs above, preserving acceptance-criteria and scenario/behavior wording **as closely as possible**. A later step (`test-plan-generator`) may need to resolve a natural-language scenario reference against this exact wording, for a `jira-story-scenario` request - losing distinguishing detail here can make that resolution fail or become ambiguous. This Skill does not itself perform, anticipate, or need to know about that matching; it only owes the next step an accurate, undiminished structuring of what the story actually said.
3. Mark inferred content as an assumption; mark Confluence-sourced content separately from Jira-sourced content.
4. Hand the structured content directly to `test-plan-generator` within the same agent turn.

## Failure Handling

- Jira/Confluence unreachable or authentication fails: stop the pipeline and report the failure; do not fabricate partial story content.
- Acceptance criteria missing or incomplete: proceed, marking the gap explicitly as an assumption/open item rather than blocking.

## Retry Strategy

- Retry transient network/API failures (timeouts, 5xx) up to 3 times with exponential backoff.
- Do not retry authentication or permission failures; surface them immediately.

## Logging

- Log: Story ID, source system(s) queried, sections extracted, number of assumptions made.

## Future Extensions

- Support additional requirement sources (e.g. Azure DevOps, ServiceNow).
- Support batch analysis of multiple linked stories under one Epic.
