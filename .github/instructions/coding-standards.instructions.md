---
description: "Use when generating or reviewing any automation code or artifact in this pipeline. Enterprise coding conventions that apply regardless of language or framework."
---

# Coding Standards

- Never hardcode credentials, tokens, API keys, or environment-specific URLs. Use configuration or environment variables and name the expected variable.
- Never generate test data containing real personal or sensitive information; use clearly synthetic values.
- Prefer deterministic, framework-native waiting (explicit conditions, web-first assertions) over arbitrary sleeps or fixed delays.
- Every generated test case or script must be traceable to a requirement, acceptance criterion, or an explicitly marked assumption. Never fabricate coverage.
- Match the target project's existing patterns and style; do not introduce a personal style or an unrequested library, framework, or test runner.
- Keep functions and classes single-purpose; avoid speculative abstractions for one-time operations.
- Do not add comments, docstrings, or defensive error handling for scenarios that cannot occur; only document logic that is not self-evident.
- Validate generated code for syntax and logical consistency before presenting it.
