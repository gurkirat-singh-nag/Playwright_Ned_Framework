# Error Handler Hook

## Responsibility

Provide centralized error detection, classification, logging, and recovery guidance for all execution failures across the platform. Capture errors from Agents, Skills, Hooks, tools, and external dependencies, determine root cause, and provide actionable remediation steps. Never silently ignore failures.

## Trigger

- **Type**: Cross-Cutting Hook (can execute at any point)
- **Scope**: Global (all Agents, Skills, Hooks)
- **Execution Point**: Triggered automatically when any error is thrown or detected during execution

## Executes Before

- N/A (error handling is reactive to failures)

## Executes After

- Any component that throws an error

## Inputs

- Error object:
  - Error type (exception class name)
  - Error message
  - Stack trace
  - Source component (Agent/Skill/Hook name)
  - Execution context (current phase, artifact being processed)
  - Timestamp
- Error severity (auto-detected or manually specified):
  - `CRITICAL`: Execution cannot continue
  - `HIGH`: Significant impact, workaround may exist
  - `MEDIUM`: Degraded functionality, execution can continue
  - `LOW`: Informational, no impact
- Recovery strategy: `retry` | `skip` | `abort` | `manual` (default: auto-detect)

## Outputs

- Error report object:
  - `error_id`: Unique identifier for this error instance
  - `error_category`: Classification of error type
  - `error_severity`: CRITICAL | HIGH | MEDIUM | LOW
  - `root_cause`: Human-readable root cause analysis
  - `affected_components`: Array of components impacted
  - `recovery_status`: recovered | failed | manual_intervention_required
  - `remediation_steps`: Array of actionable steps to resolve
  - `related_errors`: Array of related error IDs (if part of error chain)
- Error log entry: Appended to `error-log.md`
- User notification: Formatted error message with guidance

## Internal Workflow

1. **Capture Error Context**
   
   - **Error identification**:
     - Generate unique error ID: `err-<timestamp>-<random>`
     - Record timestamp
     - Capture error object (message, stack trace, name)
   
   - **Source identification**:
     - Determine which component threw the error: Agent, Skill, Hook, or external tool
     - Record component name and execution phase
   
   - **Context capture**:
     - Current artifact being processed (if applicable)
     - Input parameters to failing component
     - Environment state (Git status, framework detected, file system state)

2. **Classify Error Category**
   
   Categorize error based on error message, stack trace, and context:
   
   **Infrastructure Errors**:
   - **Git failures**: Merge conflicts, repository corruption, network failures during fetch/pull
   - **File I/O failures**: Permission denied, file not found, disk full
   - **Network failures**: Connection timeout, DNS resolution failure, HTTP errors
   
   **Framework Errors**:
   - **Framework missing**: Playwright/Selenium/REST Assured not installed
   - **Framework version mismatch**: Incompatible framework version
   - **Configuration errors**: Invalid config file, missing required settings
   
   **Artifact Errors**:
   - **Missing artifacts**: Required artifact not found (e.g., requirements.md missing)
   - **Malformed artifacts**: JSON parse error, invalid YAML, corrupted Markdown
   - **Schema violations**: Artifact does not match expected schema
   
   **Validation Errors**:
   - **Compilation errors**: TypeScript/Java compilation failed
   - **Linting errors**: ESLint/Checkstyle critical violations
   - **Test failures**: Test execution failed
   
   **MCP (Model Context Protocol) Errors**:
   - **MCP server unavailable**: Atlassian MCP, Playwright MCP not running
   - **MCP authentication failure**: Invalid credentials for Jira/Confluence
   - **MCP rate limiting**: API rate limit exceeded
   - **MCP tool failure**: MCP tool invocation failed
   
   **Requirements Errors**:
   - **Missing requirements**: User story not found, acceptance criteria missing
   - **Ambiguous requirements**: Insufficient detail to generate artifacts
   - **Conflicting requirements**: Contradictory acceptance criteria
   
   **Code Generation Errors**:
   - **Template rendering failure**: Code template failed to render
   - **Syntax errors in generated code**: Generated code has syntax errors
   - **Import resolution failure**: Cannot resolve imports/dependencies
   
   **External Tool Errors**:
   - **ESLint/Prettier failure**: Linting tool crashed
   - **TypeScript compiler failure**: tsc crashed
   - **Test runner failure**: Jest/Playwright test runner crashed

3. **Determine Error Severity**
   
   Auto-detect severity based on error category and impact:
   
   - **CRITICAL**:
     - Repository corruption
     - Missing required framework
     - Compilation errors preventing code execution
     - MCP authentication failure (cannot access requirements)
     - Disk full, permission denied (cannot write artifacts)
   
   - **HIGH**:
     - Artifact validation failure
     - Test failures
     - Quality score below threshold
     - MCP server unavailable (fallback may exist)
     - Network timeout (retry may succeed)
   
   - **MEDIUM**:
     - Linting warnings
     - Missing optional artifacts
     - Outdated framework version
     - Large commit size
   
   - **LOW**:
     - Informational warnings
     - Recommendations not critical to execution

4. **Perform Root Cause Analysis**
   
   Analyze error context to determine root cause:
   
   **Example: "File not found: requirements.md"**
   - Root cause: "jira-story-analyzer Skill did not execute or failed silently"
   - Or: "Artifact slug incorrect, searching in wrong directory"
   
   **Example: "ESLint exited with code 1"**
   - Root cause: "Generated code violates linting rules"
   - Specific rules violated: Extract from ESLint output
   
   **Example: "MCP tool 'jira.getIssue' failed"**
   - Root cause: "Jira issue ID does not exist or user lacks permissions"
   - Or: "Atlassian MCP server not running or not configured"
   
   **Example: "TypeError: Cannot read property 'url' of undefined"**
   - Root cause: "exploration.md missing 'url' field in page definition"
   - Or: "Artifact schema violation, expected object has missing property"

5. **Identify Affected Components**
   
   Determine which downstream components cannot proceed:
   
   - If requirements.md missing: test-plan-generator, test-case-documenter cannot execute
   - If page-object-generator fails: test-script-generator cannot proceed
   - If compilation fails: git-validation cannot proceed, tests cannot run
   - If MCP unavailable: All MCP-dependent Skills blocked

6. **Determine Recovery Strategy**
   
   **Auto-retry** (for transient errors):
   - Network timeouts → Retry with exponential backoff
   - File locks → Retry after delay
   - MCP rate limiting → Retry after cooldown period
   
   **Skip and continue** (for non-critical errors):
   - Linting warnings → Log warning, continue
   - Optional artifact missing → Use fallback, continue
   - Documentation generation failure → Skip docs, continue with code artifacts
   
   **Abort execution** (for critical errors):
   - Repository corruption → Cannot proceed safely
   - Missing framework → Cannot generate artifacts
   - Compilation errors → Generated code unusable
   
   **Manual intervention required**:
   - Ambiguous requirements → User must clarify
   - Merge conflicts → User must resolve
   - MCP authentication failure → User must provide credentials

7. **Generate Remediation Steps**
   
   Provide actionable steps to resolve error:
   
   **Example: Framework missing**
   ```
   Remediation:
   1. Install Playwright: npm install -D @playwright/test
   2. Initialize Playwright: npx playwright install
   3. Re-run execution
   ```
   
   **Example: MCP server unavailable**
   ```
   Remediation:
   1. Verify Atlassian MCP server is running
   2. Check MCP settings in VS Code (Copilot > MCP Servers)
   3. Test connection: Use MCP tool manually
   4. If issue persists, provide Jira URL and credentials manually
   ```
   
   **Example: Compilation errors**
   ```
   Remediation:
   1. Review compilation errors in output
   2. Fix type errors in generated files:
      - LoginPage.ts:45 - Type 'string' not assignable to 'number'
      - DashboardPage.ts:23 - Cannot find name 'Page'
   3. Run `npm run build` to verify fixes
   4. Re-run execution
   ```
   
   **Example: Test failures**
   ```
   Remediation:
   1. Run tests locally: npm test
   2. Review failed tests:
      - TC-LOGIN-001: Assertion failed - Expected "Dashboard" but got "Login"
   3. Investigate root cause: Application behavior changed or test logic incorrect
   4. Fix test or update application
   5. Re-run validation
   ```

8. **Attempt Automatic Recovery** (if applicable)
   
   Execute recovery strategy:
   
   - **Retry**: Re-execute failed operation (up to 3 attempts)
   - **Fallback**: Use alternative approach (e.g., manual requirements if MCP fails)
   - **Auto-fix**: Apply automated fixes (e.g., remove unused imports, fix formatting)
   - **Degrade gracefully**: Continue with reduced functionality
   
   Track recovery attempts and outcomes

9. **Log Error**
   
   Append error to `error-log.md`:
   ```markdown
   ## Error: err-20260806-143045-x9z1
   
   **Timestamp**: 2026-08-06T14:30:45Z
   **Severity**: CRITICAL
   **Category**: Framework Missing
   **Source**: 03_framework-discovery.hook.md
   
   **Message**:
   Playwright not found. Cannot generate UI tests without Playwright framework.
   
   **Root Cause**:
   Playwright is not installed in the project. The workspace does not contain `@playwright/test` dependency.
   
   **Affected Components**:
   - page-object-generator (blocked)
   - test-script-generator (blocked)
   
   **Remediation**:
   1. Install Playwright: `npm install -D @playwright/test`
   2. Initialize Playwright: `npx playwright install`
   3. Re-run execution
   
   **Recovery Status**: Manual intervention required
   
   **Stack Trace**:
   ```
   Error: Cannot find module '@playwright/test'
     at Framework Discovery Hook (framework-discovery.hook.md:157)
     at Hook Pipeline (hook-executor.ts:89)
   ```
   ```

10. **Generate User Notification**
    
    Format user-friendly error message:
    ```
    ❌ Execution Failed: Framework Missing
    
    Playwright is not installed. UI test generation requires Playwright.
    
    To resolve:
    1. Install Playwright: npm install -D @playwright/test
    2. Initialize Playwright: npx playwright install
    3. Re-run execution
    
    Error ID: err-20260806-143045-x9z1
    See error-log.md for details.
    ```

11. **Update Execution Context**
    
    - Record error in execution context (for execution-summary.hook.md)
    - Update execution status to `failure` or `partial_success`
    - Track error counts by category and severity

12. **Return Error Report Object**
    - Populate error report object
    - If recovery successful: Mark as recovered
    - If manual intervention required: Mark as such
    - If execution aborted: Set abort flag

## Validation Rules

No validation rules - this hook handles errors from other components.

## Failure Behaviour

Error handler itself must be resilient:

| Failure Scenario | Action |
|------------------|--------|
| Error log write failure | Log to console, continue error handling |
| Stack trace unavailable | Use message only, log warning |
| Root cause analysis failure | Use generic root cause, continue |
| Recovery attempt crashes | Log recovery failure, proceed to manual intervention |

## Retry Behaviour

- **Error log write**: Retry once after 500ms delay on file lock
- **Recovery attempt**: Retry per recovery strategy (up to 3 attempts for auto-retry)
- **Root cause analysis**: No retry (use best-effort analysis)

## Logging

**Error Detection**:
```
[Error Handler] Error detected: <error_message>
[Error Handler] Error ID: err-20260806-143045-x9z1
[Error Handler] Source: <component_name>
[Error Handler] Severity: <CRITICAL|HIGH|MEDIUM|LOW>
```

**Root Cause Analysis**:
```
[Error Handler] Analyzing root cause...
[Error Handler] Category: <error_category>
[Error Handler] Root cause: <analysis>
```

**Recovery**:
```
[Error Handler] Attempting automatic recovery...
[Error Handler] Recovery strategy: <retry|skip|fallback>
[Error Handler] Recovery attempt 1/3...
[Error Handler] ✓ Recovery successful
```

**Failure**:
```
[Error Handler] ✗ Recovery failed
[Error Handler] Manual intervention required
[Error Handler] See remediation steps in error notification
```

**Logging to File**:
```
[Error Handler] ✓ Error logged to error-log.md
[Error Handler] ✓ User notification generated
```

## Success Criteria

- Error captured and logged
- Error category and severity determined
- Root cause analysis performed (best-effort)
- Remediation steps generated
- Recovery attempted (if applicable)
- Error report object populated and returned
- User notified of error with actionable guidance

## Future Extensions

- **Error correlation**: Detect patterns across multiple errors, identify common root causes
- **Predictive error detection**: Use historical error data to predict likely failures before they occur
- **Automated ticket creation**: Create Jira/GitHub issue automatically for critical errors
- **Slack/Teams notification**: Alert team immediately on critical errors
- **Error knowledge base**: Maintain searchable knowledge base of errors and resolutions
- **AI-powered root cause analysis**: Use LLM to analyze stack traces and suggest root causes
- **Automated remediation**: Automatically apply fixes for common errors (install missing deps, fix syntax)
- **Error replay**: Capture state before error, allow re-execution from that point
- **Error metrics dashboard**: Track error frequency, MTTR (mean time to resolution), error trends
- **Integration with monitoring tools**: Send errors to Sentry, Datadog, New Relic
- **Error categorization learning**: Learn from user corrections to improve categorization
- **Multi-lingual error messages**: Provide error messages in multiple languages
- **Error severity learning**: Use ML to improve severity auto-detection based on historical impact
- **Dependency error graph**: Visualize error propagation (downstream component failures)
- **Contextual documentation**: Link errors to relevant documentation (Playwright docs, framework guides)
- **Error aggregation**: Group similar errors, report once instead of spamming
- **Silent error detection**: Detect components that fail silently (no exception thrown) via assertions
