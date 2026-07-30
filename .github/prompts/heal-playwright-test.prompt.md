---
description: "Diagnose and fix a failing Playwright test using the Unified Test Healer agent's evidence-first workflow."
agent: unified-test-healer
argument-hint: "Failing spec file/name, error message or stack trace, or a Jenkins build reference"
---
Diagnose and repair the failing Playwright automation described below using the Unified Test Healer agent's workflow: gather failure evidence, classify root cause, apply the smallest safe fix, then validate.

- Do not rewrite unrelated tests or Page Objects.
- Do not mask flaky failures with increased timeouts or retries without explaining why.
- Follow [.github/instructions/playwright.instructions.md](../instructions/playwright.instructions.md) for any spec changes.

Failure details:
