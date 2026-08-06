# Jira Story Analyzer

## Purpose

Analyse a Jira Story, and any linked Confluence pages, and convert business requirements into the structured `requirements.md` artifact that every downstream Skill depends on. This is the only Skill in the pipeline permitted to contact Jira or Confluence directly.

## Inputs

- Jira Story ID
- Title, Description, Acceptance Criteria, Comments, Attachments (optional)
- Linked Confluence pages (optional)

## Outputs

- `requirements.md`

## Artifacts Produced

- `requirements.md` - structure defined in [requirements-template.md](../../templates/requirements-template.md).

## Artifacts Consumed

- None. This Skill is the entry point of the pipeline and is the only Skill allowed to read Jira/Confluence directly.

## Execution Steps

1. Check whether `requirements.md` already exists in the request's `artifacts/<slug>/` directory and is structurally valid.
2. If valid, skip execution and reuse the existing file.
3. Otherwise, retrieve the Jira Story and any linked Confluence pages.
4. Extract and structure content into the sections defined by [requirements-template.md](../../templates/requirements-template.md).
5. Mark inferred content as an assumption; mark Confluence-sourced content separately from Jira-sourced content.
6. Write `requirements.md`.

## Failure Handling

- Jira/Confluence unreachable or authentication fails: stop the pipeline and report the failure; do not fabricate a partial `requirements.md`.
- Acceptance criteria missing or incomplete: proceed, marking the gap explicitly under Assumptions and Open items rather than blocking.

## Retry Strategy

- Retry transient network/API failures (timeouts, 5xx) up to 3 times with exponential backoff.
- Do not retry authentication or permission failures; surface them immediately.

## Logging

- Log: Story ID, source system(s) queried, sections extracted, number of assumptions made, and whether the artifact was newly generated or reused.

## Future Extensions

- Support additional requirement sources (e.g. Azure DevOps, ServiceNow).
- Support batch analysis of multiple linked stories under one Epic.