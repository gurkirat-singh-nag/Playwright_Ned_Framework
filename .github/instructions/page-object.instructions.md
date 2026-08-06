---
description: "Use when generating or editing Page Object classes for UI automation. Covers Page Object naming, structure, and locator strategy."
applyTo: "**/page-objects/**"
---

# Page Object Conventions

This project uses plain JavaScript (CommonJS), one class per page, stored in `page-objects/`.

- One class per page or major reusable component, in `page-objects/<name>Page.js` (e.g. `loginPage.js`, `dashboardPage.js`).
- Naming: `camelCase` class name suffixed with `Page` (e.g. `loginPage`, `dashboardPage`), matching the existing project convention. File name matches the class name exactly.
- Export with `module.exports = { <className> };` and import with `const { <className> } = require('../page-objects/<className>');`.
- Locators are declared as fields in the constructor (`this.fieldName = page.getBy...(...)`), not inline inside methods, so they can be reused and updated in one place.
- Locator strategy priority: accessible role/label (`getByRole`, `getByPlaceholder`, `getByLabel`) > `data-testid` > stable `id` > other deliberate attributes. Avoid XPath and deep CSS chains; if unavoidable, add a comment explaining why.
- Methods represent user-facing actions or queries (`goto()`, `validUserLogin()`, `assertUserValidation()`), not raw element access - callers should not need to know the underlying locator.
- Page Objects must not contain test assertions (`expect`). Return values or locators for the test spec to assert on.
- Reuse a shared base class or common helpers for cross-cutting concerns (navigation, waiting) already present in the target project, instead of duplicating them per page.
- Do not couple a Page Object to a specific test case; it must be reusable across every test case that interacts with that page.
