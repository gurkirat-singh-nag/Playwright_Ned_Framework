# Output Quality Validation Hook

## Responsibility

Enforce enterprise coding standards, naming conventions, reusability, maintainability, and quality best practices across all generated code artifacts (Page Objects, API clients, test specs, utilities). Detect anti-patterns, code smells, and violations before artifacts are committed.

## Trigger

- **Type**: Post-Hook (after code generation)
- **Scope**: All Skills that generate executable code
- **Execution Point**: After code generation Skills complete, before Git Validation Hook

## Executes Before

- 07_git-validation.hook.md

## Executes After

- 05_artifact-validation.hook.md
- page-object-generator
- api-client-generator
- test-script-generator
- api-test-script-generator

## Inputs

- Generated file paths: Array of absolute paths to generated code files
- Validation ruleset: `enterprise` | `standard` | `minimal` (default: enterprise)
- Auto-fix enabled: boolean (default: false)
- Target framework: Detected from framework-discovery.hook.md

## Outputs

- Quality validation result object:
  - `is_compliant`: boolean
  - `files_validated`: number
  - `violations`: Array of quality violations
  - `code_smells`: Array of detected code smells
  - `quality_score`: percentage (0-100)
  - `auto_fixes_applied`: Array of fixes applied (if auto-fix enabled)
  - `manual_fixes_required`: Array of violations requiring manual intervention
- Quality report artifact: `quality-report.md`

## Internal Workflow

1. **Load Coding Standards**
   - Read coding-standards.instructions.md
   - Read naming.instructions.md
   - Read page-object.instructions.md (for Page Objects)
   - Read playwright.instructions.md (for Playwright specs)
   - Load framework-specific linting rules (ESLint, Checkstyle, etc.)

2. **Validate Coding Standards Compliance**
   
   **General Standards** (all code artifacts):
   - **Indentation**: 2 spaces (TypeScript/JavaScript), 4 spaces (Java/Python)
   - **Line length**: Maximum 120 characters
   - **No trailing whitespace**
   - **File ends with newline**
   - **Template literals**: Use template literals for multiline strings
   - **Async/Await**: Use async/await, not callbacks or raw promises
   - **Error handling**: All async operations wrapped in try/catch
   - **Type safety**: All function parameters and return types explicitly typed (TypeScript)

   **TypeScript-specific**:
   - **Strict mode**: `"strict": true` compliance
   - **No `any` type**: Explicit types required
   - **No `var`**: Use `const` or `let` only
   - **Prefer `const`**: Use `const` unless reassignment needed
   - **Arrow functions**: Prefer arrow functions for callbacks
   - **Optional chaining**: Use `?.` for nullable property access
   - **Nullish coalescing**: Use `??` over `||` for default values

3. **Validate Naming Conventions**
   
   **File naming**:
   - **Page Objects**: PascalCase with "Page" suffix (e.g., `LoginPage.ts`)
   - **API Clients**: PascalCase with "Client" suffix (e.g., `UserClient.ts`)
   - **Test specs**: kebab-case with `.spec.ts` suffix (e.g., `login-page.spec.ts`)
   - **Utilities**: camelCase with descriptive name (e.g., `waitUtils.ts`)
   
   **Class naming**:
   - **PascalCase**: All classes (e.g., `LoginPage`, `UserClient`)
   - **Match filename**: Class name matches filename
   
   **Method naming**:
   - **camelCase**: All methods (e.g., `clickSubmitButton()`, `getUserById()`)
   - **Verb prefixes**: Use action verbs (click, get, set, validate, wait, navigate)
   - **No abbreviations**: Use full words (e.g., `getUserInformation()` not `getUsrInfo()`)
   
   **Variable naming**:
   - **camelCase**: All variables (e.g., `submitButton`, `userEmail`)
   - **Descriptive names**: No single-letter variables except loop iterators
   - **No Hungarian notation**: No type prefixes (e.g., `strName`, `intAge`)
   
   **Constant naming**:
   - **UPPER_SNAKE_CASE**: All constants (e.g., `MAX_RETRY_COUNT`, `API_BASE_URL`)
   
   **Test case ID format**:
   - **Pattern**: `TC-{FEATURE}-{NNN}` (e.g., `TC-LOGIN-001`)
   - **Feature code**: All caps, 3-10 characters
   - **Number**: Zero-padded 3 digits

4. **Validate Code Reusability**
   
   **Detect duplicated code**:
   - Identify duplicated methods across files (exact or near-duplicates)
   - Flag duplicated locators across Page Objects
   - Detect copy-pasted test steps
   - Recommend extraction to utility/base class
   
   **Detect unused code**:
   - Unused imports
   - Unused private methods
   - Unused variables
   - Unreferenced constants
   
   **Check inheritance usage**:
   - Page Objects extend BasePage (or equivalent)
   - API Clients extend BaseClient (if exists)
   - Test specs use common fixtures
   - Utilities are stateless (no class, only functions)

5. **Validate Page Object Specific Rules** (if applicable)
   
   - **Locator strategy**:
     - Prefer: `getByRole`, `getByLabel`, `getByTestId`
     - Avoid: XPath (except when necessary), CSS selectors with indices
     - No hardcoded indices: `nth(0)` acceptable, `nth(5)` questionable
   - **Wait strategy**:
     - No hardcoded waits: `sleep()`, `setTimeout()`, `Thread.sleep()`
     - Use framework built-in waits: `waitFor()`, `waitForSelector()`
     - No infinite waits: All waits have timeout
   - **Page Object boundaries**:
     - One Page Object per logical page/component
     - No cross-page actions (navigation handled by navigation helpers)
   - **Assertions**:
     - No assertions in Page Objects
     - Page Objects return data, tests assert
   - **Locator visibility**:
     - Locators are private or protected
     - Exposed via action methods only

6. **Validate Test Spec Specific Rules** (if applicable)
   
   - **Test structure**:
     - One test suite per file (`test.describe`)
     - Test cases properly organized
     - Setup/teardown properly used (`beforeEach`, `afterEach`)
   - **Test independence**:
     - Tests do not depend on execution order
     - Each test can run in isolation
     - No shared mutable state between tests
   - **Assertions**:
     - All tests have at least one assertion
     - Assertions are meaningful (not `expect(true).toBe(true)`)
     - Use specific matchers (`toHaveText`, not `toContain` when full match expected)
   - **Test data**:
     - No hardcoded production data
     - Use data generators or fixtures
     - Sensitive data externalized to environment variables
   - **Annotations**:
     - Test case ID annotation present: `test.id('TC-LOGIN-001')`
     - Priority annotation (if supported): `test.priority('High')`
     - Tags present for categorization: `test.tags(['smoke', 'authentication'])`

7. **Validate API Client Specific Rules** (if applicable)
   
   - **HTTP client instantiation**:
     - Client instantiated once (singleton or dependency injection)
     - Base URL configured centrally
     - Timeouts configured
   - **Error handling**:
     - All HTTP requests wrapped in try/catch
     - HTTP errors translated to domain exceptions
     - Retry logic for transient failures (if applicable)
   - **Type safety**:
     - Request DTOs defined
     - Response DTOs defined
     - No `any` types for API contracts
   - **Authentication**:
     - Auth tokens not hardcoded
     - Auth handled by interceptor/middleware
     - Credentials from environment or secure store

8. **Run Static Analysis Tools**
   
   **TypeScript/JavaScript**:
   - **ESLint**: Run ESLint with enterprise config
   - **TypeScript compiler**: Run `tsc --noEmit` to check type errors
   - **Prettier**: Check code formatting
   
   **Java**:
   - **Checkstyle**: Run Checkstyle with enterprise config
   - **PMD**: Detect code smells
   - **SpotBugs**: Detect bugs
   
   **Python**:
   - **Pylint**: Run Pylint
   - **Black**: Check code formatting
   - **Mypy**: Check type annotations

9. **Compute Quality Score**
   
   Calculate score based on:
   - **Coding standards compliance**: 30%
   - **Naming conventions compliance**: 20%
   - **Code reusability (no duplication)**: 20%
   - **Framework best practices**: 15%
   - **Static analysis results**: 15%
   
   Quality score: 0-100%
   - **90-100%**: Excellent
   - **70-89%**: Good
   - **50-69%**: Needs improvement
   - **<50%**: Poor, requires rework

10. **Apply Auto-Fixes** (if enabled)
    
    - **Auto-fixable violations**:
      - Unused imports (remove)
      - Code formatting (run Prettier/Black)
      - Missing newline at end of file (add)
      - Trailing whitespace (remove)
      - `var` → `let`/`const` (convert)
      - String concatenation → template literals (convert)
    
    - **Non-auto-fixable violations**:
      - Hardcoded waits (manual refactor required)
      - Duplicated code (manual extraction required)
      - Missing error handling (manual addition required)
      - Suboptimal locators (manual improvement required)

11. **Generate Quality Report**
    
    Write `quality-report.md`:
    ```markdown
    # Code Quality Report
    Generated: <timestamp>
    
    ## Summary
    - Files validated: <n>
    - Quality score: <score>%
    - Violations: <n>
    - Auto-fixes applied: <n>
    
    ## Violations
    
    ### CRITICAL
    - [LoginPage.ts:45] Hardcoded wait detected: Thread.sleep(5000)
    - [UserClient.ts:23] API credentials hardcoded
    
    ### WARN
    - [login.spec.ts:12] Unused import: waitUtils
    - [LoginPage.ts:30] Suboptimal locator: getByCSS('button:nth(5)')
    
    ## Recommendations
    - Refactor hardcoded waits to use framework built-in waits
    - Externalize credentials to environment variables
    - Remove unused imports
    - Improve locator strategy for submit button
    ```

12. **Return Quality Validation Result**
    - Populate result object
    - If quality score <50% and ruleset = enterprise: Recommend rework
    - If auto-fixes applied: Log applied fixes

## Validation Rules

| Rule | Condition | Severity |
|------|-----------|----------|
| No hardcoded waits | No sleep/setTimeout in code | CRITICAL |
| No hardcoded credentials | No API keys, passwords in code | CRITICAL |
| Naming conventions | All identifiers follow conventions | WARN |
| No unused imports | All imports used | WARN |
| No duplicated code | Code duplication <10% | WARN |
| Type safety | All parameters/returns typed (TS) | CRITICAL |
| Error handling present | Async operations have try/catch | CRITICAL |
| Quality score ≥ 70% | Code meets minimum quality threshold | WARN |
| ESLint/Checkstyle passes | No linting errors | WARN |

## Failure Behaviour

| Failure Scenario | Action |
|------------------|--------|
| Quality score <50% (enterprise ruleset) | STOP execution, request rework |
| Hardcoded credentials detected | STOP execution, security violation |
| Critical violations (hardcoded waits) | STOP execution (strict), WARN (relaxed) |
| Linting errors | WARN, log errors, continue execution |
| Auto-fix failure | WARN, log failed fix, continue manual validation |
| Quality report write failure | WARN, log error, continue execution (in-memory result available) |

## Retry Behaviour

- **Static analysis tool execution**: Retry once after 1s delay on tool crash
- **File write (quality report)**: Retry once after 500ms delay on file lock
- **Auto-fix application**: No retry (fix failures require manual intervention)

## Logging

**Start**:
```
[Output Quality Validation] Validating generated code quality...
[Output Quality Validation] Files: <n>
[Output Quality Validation] Ruleset: <enterprise|standard|minimal>
```

**During**:
```
[Output Quality Validation] Checking coding standards...
[Output Quality Validation] Validating naming conventions...
[Output Quality Validation] Detecting code duplication...
[Output Quality Validation] Running ESLint...
[Output Quality Validation] Computing quality score...
```

**Success**:
```
[Output Quality Validation] ✓ All files comply with coding standards
[Output Quality Validation] ✓ No code smells detected
[Output Quality Validation] ✓ Quality score: <score>% (Excellent)
```

**Info**:
```
[Output Quality Validation] ℹ Auto-fixes applied: <n>
[Output Quality Validation] ℹ Quality report generated
```

**Warning**:
```
[Output Quality Validation] ⚠ Unused import detected: <import>
[Output Quality Validation] ⚠ Code duplication: <details>
[Output Quality Validation] ⚠ Suboptimal locator in <file>:<line>
[Output Quality Validation] ⚠ Quality score below threshold: <score>%
```

**Failure**:
```
[Output Quality Validation] ✗ Hardcoded wait detected: <file>:<line>
[Output Quality Validation] ✗ Security violation: hardcoded credentials in <file>
[Output Quality Validation] ✗ Quality score critical: <score>%
[Output Quality Validation] ✗ STOP: Code quality below acceptable threshold
```

## Success Criteria

- All generated files validated
- Static analysis tools executed (or attempted)
- Quality score computed
- Quality validation result object populated and returned
- Quality report generated (if writable)
- If quality score ≥ 70% or ruleset = relaxed: Execution continues
- If quality score <50% and ruleset = enterprise: Execution halted

## Future Extensions

- **AI-powered code review**: Use LLM to review code for logic errors and improvement opportunities
- **Complexity analysis**: Compute cyclomatic complexity, flag overly complex methods
- **Maintainability index**: Calculate maintainability index (MI) for each file
- **Security scanning**: Integrate SAST tools (SonarQube, Snyk) for vulnerability detection
- **Performance profiling**: Detect performance anti-patterns (N+1 queries, inefficient loops)
- **Accessibility validation**: Check UI tests include accessibility checks
- **License compliance**: Verify all dependencies have compatible licenses
- **Documentation coverage**: Ensure all public APIs have JSDoc/Javadoc
- **Test coverage analysis**: Ensure generated tests achieve minimum coverage threshold
- **Mutation testing**: Apply mutation testing to validate test effectiveness
- **Trend analysis**: Track quality score over time, detect quality regressions
- **Team comparison**: Compare quality scores across teams/projects
- **Custom rulesets**: Allow teams to define custom quality gates
- **IDE integration**: Real-time quality feedback in IDE as code is generated
- **Automated PR comments**: Post quality report as PR comment for review
