# Git Validation Hook

## Responsibility

Perform pre-commit validation of all generated and modified artifacts to ensure code quality, compilation success, linting compliance, formatting correctness, and test execution success before allowing commits to version control. Prevent broken or non-compliant code from entering the repository.

## Trigger

- **Type**: Post-Hook (before commit)
- **Scope**: Global (all code-generating workflows)
- **Execution Point**: After all generation and quality validation, before user-initiated commit or auto-commit

## Executes Before

- Git commit operation
- 08_execution-summary.hook.md

## Executes After

- 06_output-quality-validation.hook.md

## Inputs

- Changed files list: Array of file paths modified during execution
- Commit mode: `manual` | `auto` | `dry-run` (default: manual)
- Validation level: `full` | `incremental` | `minimal` (default: full)
- Pre-commit hooks enabled: boolean (default: true)

## Outputs

- Git validation result object:
  - `is_commit_ready`: boolean
  - `changed_files`: Array of modified file paths
  - `validation_results`: Map of validation step → pass/fail
  - `compilation_status`: success | failure
  - `linting_errors`: Array of linting errors
  - `formatting_issues`: Array of formatting issues
  - `test_execution_status`: success | failure | skipped
  - `blocker_issues`: Array of issues preventing commit
- Pre-commit validation report: `pre-commit-validation.md`

## Internal Workflow

1. **Identify Changed Files**
   - Execute `git status --porcelain`
   - Filter for:
     - Modified files (M)
     - Added files (A)
     - Renamed files (R)
   - Exclude:
     - Untracked files (??) unless explicitly staged
     - Deleted files (D) - no validation needed
   - Categorize changes:
     - Code files (.ts, .js, .java, .py, .cs)
     - Test files (*.spec.ts, *.test.ts, *Test.java)
     - Configuration files (*.json, *.yml, *.xml)
     - Documentation files (*.md)

2. **Validate Formatting**
   
   **TypeScript/JavaScript**:
   - Run `prettier --check <files>`
   - If formatting errors: Log files, offer auto-fix
   - If validation level = full: FAIL on formatting errors
   - If validation level = minimal: WARN on formatting errors
   
   **Java**:
   - Run `mvn spotless:check` or `gradle spotlessCheck`
   - If formatting errors: Log violations, offer auto-fix
   
   **Python**:
   - Run `black --check <files>`
   - If formatting errors: Log violations, offer auto-fix
   
   **Auto-fix** (if enabled and validation level ≠ dry-run):
   - Run `prettier --write <files>` (TypeScript/JavaScript)
   - Run `black <files>` (Python)
   - Run `mvn spotless:apply` (Java)
   - Re-stage auto-fixed files

3. **Validate Linting**
   
   **TypeScript/JavaScript**:
   - Run `eslint <files>`
   - Capture linting errors and warnings
   - If errors: Log errors with file/line/rule
   - If validation level = full: FAIL on linting errors
   - If validation level = minimal: WARN on linting errors
   
   **Java**:
   - Run `mvn checkstyle:check` or `gradle checkstyleMain checkstyleTest`
   - Capture violations
   
   **Python**:
   - Run `pylint <files>`
   - Capture violations
   
   **Auto-fix** (if enabled):
   - Run `eslint --fix <files>` (TypeScript/JavaScript)
   - Re-stage auto-fixed files

4. **Validate Compilation**
   
   **TypeScript**:
   - Run `tsc --noEmit` (type checking only, no output)
   - Capture type errors
   - If errors: FAIL, log errors with file/line
   
   **Java**:
   - Run `mvn compile test-compile` or `gradle compileJava compileTestJava`
   - Capture compilation errors
   - If errors: FAIL, log errors
   
   **Python**:
   - Run `mypy <files>` (type checking)
   - Capture type errors
   - If errors: WARN (Python typing is optional)
   
   **Compilation errors = BLOCKER**:
   - Cannot commit non-compiling code
   - Provide error summary and remediation guidance

5. **Validate Test Execution**
   
   **Determine test execution scope**:
   - **validation level = full**: Run all tests
   - **validation level = incremental**: Run only tests for changed files
   - **validation level = minimal**: Run smoke tests only
   - **commit mode = dry-run**: Skip test execution
   
   **Execute tests**:
   - **TypeScript/JavaScript**:
     - Run `npm test` or `npx playwright test` (depending on framework)
   - **Java**:
     - Run `mvn test` or `gradle test`
   - **Python**:
     - Run `pytest <files>`
   
   **Capture results**:
   - Test execution time
   - Passed/failed/skipped test counts
   - Failed test details (name, error message, stack trace)
   
   **Failure handling**:
   - If validation level = full: FAIL on any test failure
   - If validation level = incremental: WARN on test failures, allow commit decision
   - If validation level = minimal: WARN on test failures, continue
   
   **Test failures = BLOCKER (validation level = full)**:
   - Cannot commit failing tests
   - Provide failed test summary

6. **Validate Git Commit Hygiene**
   
   **Check branch**:
   - Verify not committing directly to protected branches (main, master, develop)
   - If on protected branch: WARN, recommend feature branch
   
   **Check commit size**:
   - Count changed files
   - Calculate total changed lines
   - If >100 files or >3000 lines: WARN (large commit, consider splitting)
   
   **Check commit content**:
   - Ensure no sensitive data in changed files:
     - API keys, passwords, tokens (regex scan)
     - Absolute file paths
     - Personal identifiable information (PII)
   - If sensitive data detected: FAIL, prevent commit
   
   **Check file permissions**:
   - Verify no executable permissions on non-executable files
   - Verify no 777 permissions

7. **Run Pre-Commit Hooks** (if enabled)
   
   - Check for `.git/hooks/pre-commit` or `husky` configuration
   - Execute configured pre-commit hooks
   - Capture hook execution results
   - If pre-commit hook fails: FAIL, log hook output

8. **Generate Pre-Commit Validation Report**
   
   Write `pre-commit-validation.md`:
   ```markdown
   # Pre-Commit Validation Report
   Generated: <timestamp>
   
   ## Summary
   - Changed files: <n>
   - Commit ready: <Yes|No>
   - Validation level: <full|incremental|minimal>
   
   ## Validation Results
   - ✓ Formatting: Passed
   - ✓ Linting: Passed (2 warnings)
   - ✓ Compilation: Passed
   - ✗ Tests: Failed (3 failures)
   
   ## Blocker Issues
   - Test failure: TC-LOGIN-001 failed with assertion error
   - Test failure: TC-LOGIN-002 timeout exceeded
   
   ## Warnings
   - Linting warning: Unused variable 'userId' in UserClient.ts:45
   - Large commit: 87 files changed
   
   ## Recommendations
   - Fix failing tests before committing
   - Remove unused variable or suppress warning
   - Consider splitting commit into smaller logical units
   ```

9. **Determine Commit Readiness**
   
   **Commit ready if**:
   - No blocker issues
   - Formatting passed or auto-fixed
   - Linting passed (if validation level = full)
   - Compilation passed
   - Tests passed (if validation level = full)
   - No sensitive data detected
   - Pre-commit hooks passed (if enabled)
   
   **Commit blocked if**:
   - Compilation errors
   - Test failures (validation level = full)
   - Sensitive data detected
   - Pre-commit hooks failed
   
   **Commit decision deferred to user if**:
   - Linting warnings (validation level = incremental/minimal)
   - Test failures (validation level = incremental/minimal)
   - Large commit size
   - Committing to protected branch

10. **Return Git Validation Result**
    - Populate result object
    - If is_commit_ready = false: List blocker issues
    - If is_commit_ready = true: Proceed to next hook or commit

## Validation Rules

| Rule | Condition | Severity |
|------|-----------|----------|
| Code compiles | TypeScript/Java/Python compilation succeeds | CRITICAL |
| Tests pass (full validation) | All tests pass | CRITICAL |
| No sensitive data | No credentials/API keys in code | CRITICAL |
| Formatting compliant | Prettier/Black passes | WARN (auto-fixable) |
| Linting compliant | ESLint/Checkstyle passes | WARN |
| Not on protected branch | Current branch ≠ main/master | WARN |
| Commit size reasonable | <100 files, <3000 lines | INFO |
| Pre-commit hooks pass | All hooks exit with 0 | CRITICAL |

## Failure Behaviour

| Failure Scenario | Action |
|------------------|--------|
| Compilation errors | STOP commit, list errors, request fix |
| Test failures (full validation) | STOP commit, list failed tests, request fix |
| Sensitive data detected | STOP commit, list files with sensitive data, request removal |
| Pre-commit hooks failed | STOP commit, show hook output, request fix |
| Formatting errors (auto-fix disabled) | STOP commit (full), WARN (incremental/minimal) |
| Linting errors | STOP commit (full), WARN (incremental/minimal) |
| Large commit size | WARN, recommend splitting, allow user decision |
| Committing to protected branch | WARN, recommend feature branch, allow user decision |

## Retry Behaviour

- **Formatting/linting tool execution**: Retry once after 1s delay on tool crash
- **Compilation**: No retry (compilation errors require manual fix)
- **Test execution**: No retry (test failures require manual fix)
- **Pre-commit hooks**: No retry (hook failures require manual intervention)

## Logging

**Start**:
```
[Git Validation] Validating changes before commit...
[Git Validation] Changed files: <n>
[Git Validation] Validation level: <full|incremental|minimal>
```

**During**:
```
[Git Validation] Checking code formatting...
[Git Validation] Running linters...
[Git Validation] Compiling code...
[Git Validation] Executing tests...
[Git Validation] Scanning for sensitive data...
```

**Success**:
```
[Git Validation] ✓ Formatting: Passed
[Git Validation] ✓ Linting: Passed
[Git Validation] ✓ Compilation: Passed
[Git Validation] ✓ Tests: Passed (42/42)
[Git Validation] ✓ No sensitive data detected
[Git Validation] ✓ All validations passed, commit ready
```

**Warning**:
```
[Git Validation] ⚠ Linting warnings: <n>
[Git Validation] ⚠ Large commit: <n> files changed
[Git Validation] ⚠ Committing to protected branch: main
```

**Failure**:
```
[Git Validation] ✗ Compilation failed: <error_count> error(s)
[Git Validation] ✗ Tests failed: <n> failure(s)
[Git Validation] ✗ Sensitive data detected in: <file_list>
[Git Validation] ✗ Pre-commit hook failed: <hook_name>
[Git Validation] ✗ STOP: Commit blocked due to critical issues
```

**Auto-fix**:
```
[Git Validation] 🔧 Auto-fixing formatting issues...
[Git Validation] 🔧 Applied Prettier to <n> file(s)
[Git Validation] 🔧 Auto-fixed linting issues: <n>
```

## Success Criteria

- All changed files identified
- Formatting validation performed
- Linting validation performed
- Compilation validation performed
- Test execution performed (or skipped per validation level)
- Sensitive data scan performed
- Git validation result object populated and returned
- If is_commit_ready = true or validation level = minimal: Execution continues
- If is_commit_ready = false and validation level = full: Execution halted

## Future Extensions

- **Incremental compilation**: Only compile changed files and dependencies
- **Parallel test execution**: Run tests in parallel to reduce validation time
- **Smart test selection**: Use code coverage mapping to run only affected tests
- **Commit message validation**: Enforce commit message conventions (Conventional Commits)
- **Commit signing validation**: Verify commits are GPG-signed
- **Dependency vulnerability scanning**: Check for known vulnerabilities in dependencies
- **License header validation**: Ensure all files have required license headers
- **Breaking change detection**: Detect API breaking changes, warn before commit
- **Branch naming validation**: Enforce branch naming conventions (feature/, bugfix/, hotfix/)
- **JIRA ticket validation**: Ensure commit references valid JIRA ticket in message
- **Code coverage validation**: Fail commit if coverage drops below threshold
- **Performance regression detection**: Run performance benchmarks, fail if regression detected
- **Accessibility validation**: Run accessibility tests (axe-core) on UI changes
- **Visual regression testing**: Capture screenshots, compare against baseline
- **Infrastructure as Code validation**: Validate Terraform/CloudFormation/Kubernetes manifests
- **Database migration validation**: Validate Liquibase/Flyway migrations are reversible
- **API contract validation**: Ensure API changes are backward-compatible
- **Documentation completeness**: Ensure code changes include corresponding documentation updates
