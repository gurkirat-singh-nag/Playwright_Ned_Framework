---
description: "Generate UI test cases and Playwright automation from a Jira story, Confluence page, application URL, or plain-language requirement, using the full requirements to exploration to test-plan to test-cases to page-objects to tests pipeline."
agent: test-generator-ui
argument-hint: "Jira Story ID, Confluence URL, application URL, or plain-language UI requirement"
---
Generate UI test cases and Playwright automation for the requirement provided below, following the UI Test Generator agent's full pipeline: requirements, exploration, test plan, manual test cases, page objects, then Playwright automation.

- If a Jira Story ID, Confluence URL, or application URL is given, retrieve it before analysing.
- If only manual test cases are needed and automation is out of scope, say so explicitly and stop after generating `test-cases.md` and `testcases.json`.
- Reuse existing Page Objects, fixtures, and framework conventions in the target repository before creating new ones.
- Follow [.github/instructions/playwright.instructions.md](../instructions/playwright.instructions.md) and [.github/instructions/page-object.instructions.md](../instructions/page-object.instructions.md) for all generated code.

Requirement:
