---
description: "Use when generating or editing Page Object classes for UI automation. Covers Page Object naming, structure, and locator strategy."
applyTo: "**/pageobjects/**"
---

# Page Object Conventions

- One class (or module, for functional-style frameworks) per page or major reusable component.
- Naming: `PascalCase` class name suffixed with `Page` (e.g. `LoginPage`, `CheckoutPage`); file name matches the class in the project's existing case convention.
- Locators are declared as class fields/properties, not inline inside methods, so they can be reused and updated in one place.
- Locator strategy priority: accessible role/label > `data-testid` > stable `id` > other deliberate attributes. Avoid XPath and deep CSS chains; if unavoidable, add a comment explaining why.
- Methods represent user-facing actions or queries (`login()`, `submitOrder()`, `getErrorMessage()`), not raw element access - callers should not need to know the underlying locator.
- Page Objects must not contain test assertions (`expect`). Return values or state for the test spec to assert on.
- Reuse a shared base class or common helpers for cross-cutting concerns (navigation, waiting) already present in the target project, instead of duplicating them per page.
- Do not couple a Page Object to a specific test case; it must be reusable across every test case that interacts with that page.
