# Artifact Validation Hook

## Responsibility

Validate all generated pipeline artifacts (requirements.md, exploration.md, api-exploration.md, test-plan.md, test-cases.md, testcases.json, Page Objects, test specs) for completeness, correctness, schema compliance, and mandatory section presence before downstream Skills consume them or execution proceeds.

## Trigger

- **Type**: Post-Hook (after artifact generation)
- **Scope**: All Skills that produce artifacts
- **Execution Point**: Immediately after a Skill writes an artifact, before next pipeline phase

## Executes Before

- Next pipeline phase (e.g., test-plan-generator must validate requirements.md before proceeding)

## Executes After

- All generation Skills:
  - jira-story-analyzer → validates `requirements.md`
  - playwright-browser-exploration → validates `exploration.md`
  - api-contract-analyzer → validates `api-exploration.md`
  - test-plan-generator → validates `test-plan.md`
  - test-case-documenter → validates `test-cases.md` and `testcases.json`
  - page-object-generator → validates Page Object files
  - api-client-generator → validates API client files
  - test-script-generator → validates test spec files
  - api-test-script-generator → validates API test spec files

## Inputs

- Artifact type: `requirements` | `exploration` | `api-exploration` | `test-plan` | `test-cases` | `testcases-json` | `page-object` | `api-client` | `test-spec`
- Artifact file path: absolute path to generated artifact
- Validation strictness: `strict` | `relaxed` (default: strict)
- Expected schema version: semantic version (e.g., "1.0.0")

## Outputs

- Validation result object:
  - `is_valid`: boolean
  - `artifact_type`: string
  - `artifact_path`: string
  - `errors`: Array of validation errors with severity CRITICAL
  - `warnings`: Array of validation warnings with severity WARN
  - `missing_sections`: Array of missing mandatory sections
  - `schema_violations`: Array of schema validation errors
  - `completeness_score`: percentage (0-100)
- Corrective action recommendations

## Internal Workflow

1. **Load Artifact**
   - Read artifact file from provided path
   - Verify file exists and is readable
   - If file not found: FAIL immediately

2. **Determine Validation Schema**
   - Based on artifact type, select validation schema:
     - **requirements.md**: See artifact-schemas.instructions.md
     - **exploration.md**: See artifact-schemas.instructions.md
     - **api-exploration.md**: See artifact-schemas.instructions.md
     - **test-plan.md**: See artifact-schemas.instructions.md
     - **test-cases.md**: See artifact-schemas.instructions.md
     - **testcases.json**: JSON schema for test case array
     - **page-object**: TypeScript class structure validation
     - **api-client**: TypeScript class structure validation
     - **test-spec**: Playwright/Jest test file structure validation

3. **Validate Markdown Artifacts**
   - **Parse Markdown structure**:
     - Extract all heading levels (H1, H2, H3)
     - Build document outline
   - **Verify mandatory sections**:
     - **requirements.md**: Story Details, Acceptance Criteria, Out of Scope, Business Rules, Dependencies, Test Objectives
     - **exploration.md**: Application Overview, Page Structure, Interactive Elements, Validation Points, Navigation Flows, Technical Notes
     - **api-exploration.md**: Endpoint Overview, Request Schema, Response Schema, Authentication, Error Responses, Dependencies
     - **test-plan.md**: Test Scope, Test Strategy, Test Scenarios, Test Data, Environment Requirements, Risks & Assumptions
     - **test-cases.md**: Test Case ID, Title, Preconditions, Test Steps, Expected Results, Priority, Tags
   - **Check section completeness**:
     - Verify each mandatory section has content (not empty, not placeholder)
     - Flag sections with placeholder text: "TODO", "TBD", "[To be added]"
   - **Verify section order**:
     - Ensure sections follow canonical order from schema
   - **Check content quality**:
     - Minimum word count per section (configurable)
     - No duplicate headings
     - Internal links valid (for cross-references)

4. **Validate JSON Artifacts**
   - **testcases.json**:
     - Parse JSON, verify valid syntax
     - Validate against JSON schema:
       ```json
       {
         "type": "array",
         "items": {
           "type": "object",
           "required": ["id", "title", "priority", "steps", "expected"],
           "properties": {
             "id": {"type": "string", "pattern": "^TC-[A-Z]+-[0-9]{3}$"},
             "title": {"type": "string", "minLength": 10},
             "priority": {"enum": ["Critical", "High", "Medium", "Low"]},
             "preconditions": {"type": "array"},
             "steps": {"type": "array", "minItems": 1},
             "expected": {"type": "array", "minItems": 1},
             "tags": {"type": "array"}
           }
         }
       }
       ```
     - Verify no duplicate test case IDs
     - Verify ID format follows naming conventions (see naming.instructions.md)
     - Check referential integrity: If test case references page object, verify page object exists

5. **Validate TypeScript Artifacts**
   - **Page Objects**:
     - Parse TypeScript AST
     - Verify class declaration present
     - Verify class extends BasePage (or framework-specific base class)
     - Verify constructor accepts `Page` or `WebDriver` parameter
     - Verify locators defined (as class properties or methods)
     - Verify action methods present (e.g., `login()`, `clickSubmit()`)
     - Verify no hardcoded waits (`sleep`, `setTimeout`)
     - Verify proper imports (Playwright, BasePage)
     - Verify JSDoc comments present for public methods
   - **API Clients**:
     - Parse TypeScript AST
     - Verify class declaration present
     - Verify HTTP client instantiated (axios, fetch, request)
     - Verify endpoint methods present (e.g., `getUser()`, `createUser()`)
     - Verify proper error handling (try/catch)
     - Verify type definitions for request/response
     - Verify no hardcoded credentials
   - **Test Specs**:
     - Parse TypeScript AST
     - Verify test framework imports (`@playwright/test`, `jest`)
     - Verify test suite defined (`test.describe`)
     - Verify test cases defined (`test('...')`)
     - Verify assertions present (`expect(...)`)
     - Verify no skipped tests (`.skip`) without TODO comment
     - Verify test case IDs in test titles or annotations
     - Verify proper setup/teardown (beforeEach, afterEach)

6. **Check Cross-Artifact Consistency**
   - **test-cases.md ↔ testcases.json**:
     - Verify test case IDs match between Markdown and JSON
     - Verify test case count matches
   - **testcases.json ↔ test specs**:
     - Verify each JSON test case has corresponding test spec
     - Verify test case IDs referenced in specs exist in JSON
   - **exploration.md ↔ Page Objects**:
     - Verify page objects generated for pages documented in exploration.md
     - Verify locators in page objects match elements documented in exploration.md

7. **Compute Completeness Score**
   - Calculate percentage based on:
     - Mandatory sections present: 40%
     - Section content completeness (no placeholders): 30%
     - Cross-artifact consistency: 20%
     - Code quality (TypeScript artifacts): 10%
   - Completeness score: 0-100%

8. **Generate Validation Report**
   - Categorize findings:
     - **CRITICAL**: Missing mandatory sections, invalid JSON, syntax errors, schema violations
     - **WARN**: Empty sections, placeholder content, missing optional sections, style violations
     - **INFO**: Recommendations, improvement suggestions
   - For each finding:
     - Location: file path, line number (if applicable)
     - Description: what is wrong
     - Remediation: how to fix

9. **Return Validation Result**
   - Populate validation result object
   - If `is_valid = false` and strictness = strict: Recommend halting pipeline
   - If `is_valid = false` and strictness = relaxed: Log warnings, continue

## Validation Rules

| Rule | Condition | Severity |
|------|-----------|----------|
| Artifact file exists | File readable at provided path | CRITICAL |
| Valid file format | JSON parseable, Markdown parseable, TS parseable | CRITICAL |
| All mandatory sections present | Requirements.md has all required sections | CRITICAL |
| No placeholder content | No "TODO", "TBD", "[To be added]" in production artifacts | WARN |
| Schema compliance | testcases.json matches JSON schema | CRITICAL |
| ID format correct | Test case IDs follow TC-{FEATURE}-{NNN} pattern | CRITICAL |
| No duplicate IDs | Unique test case IDs | CRITICAL |
| Cross-artifact consistency | Test case IDs match across artifacts | WARN |
| Code quality (TS) | No hardcoded waits, proper imports, JSDoc present | WARN |
| Completeness score ≥ 80% | Artifact sufficiently complete | WARN |

## Failure Behaviour

| Failure Scenario | Action |
|------------------|--------|
| Artifact file not found | STOP execution, report missing artifact, halt pipeline |
| Invalid JSON syntax | STOP execution, report parse error with line number, request regeneration |
| Missing mandatory section | STOP execution (strict mode), WARN and continue (relaxed mode) |
| Schema violation | STOP execution (strict mode), WARN and continue (relaxed mode) |
| Placeholder content | WARN, flag for manual review, continue execution |
| Low completeness score (<60%) | WARN, recommend regeneration, continue execution |
| Cross-artifact inconsistency | WARN, flag inconsistencies, continue execution |
| TypeScript syntax error | STOP execution, report error with line number, request fix |

## Retry Behaviour

- **File read**: Retry once after 200ms delay on transient file lock
- **JSON parse**: No retry (syntax errors require manual correction)
- **TypeScript parse**: No retry (syntax errors require manual correction)

## Logging

**Start**:
```
[Artifact Validation] Validating <artifact_type>...
[Artifact Validation] File: <artifact_path>
[Artifact Validation] Strictness: <strict|relaxed>
```

**During**:
```
[Artifact Validation] Checking mandatory sections...
[Artifact Validation] Validating schema compliance...
[Artifact Validation] Computing completeness score...
```

**Success**:
```
[Artifact Validation] ✓ All mandatory sections present
[Artifact Validation] ✓ Schema validation passed
[Artifact Validation] ✓ Completeness score: <score>%
[Artifact Validation] ✓ Artifact is valid
```

**Warning**:
```
[Artifact Validation] ⚠ Placeholder content detected in section: <section>
[Artifact Validation] ⚠ Optional section missing: <section>
[Artifact Validation] ⚠ Completeness score below threshold: <score>%
[Artifact Validation] ⚠ Cross-artifact inconsistency: <details>
```

**Failure**:
```
[Artifact Validation] ✗ Missing mandatory section: <section>
[Artifact Validation] ✗ Invalid JSON syntax at line <n>: <error>
[Artifact Validation] ✗ Schema violation: <details>
[Artifact Validation] ✗ STOP: Artifact validation failed (strict mode)
```

## Success Criteria

- Artifact file loaded successfully
- Schema validation performed
- Mandatory sections verified
- Completeness score computed
- Validation result object populated and returned
- If strictness = strict and is_valid = false: Execution halted
- If strictness = relaxed or is_valid = true: Execution continues

## Future Extensions

- **Auto-repair**: Automatically fix common issues (add missing sections, reformat IDs)
- **Versioned schemas**: Support multiple schema versions for backward compatibility
- **Custom validation rules**: Allow projects to define custom validation rules via configuration
- **Semantic validation**: Use LLM to validate content quality (e.g., are test steps actionable?)
- **Accessibility validation**: Check Page Objects include accessibility locators (ARIA roles)
- **Performance validation**: Flag inefficient locators (e.g., XPath with `//*`)
- **Security validation**: Detect hardcoded credentials, API keys, sensitive data in artifacts
- **Localization validation**: Verify test artifacts support multiple languages/locales
- **Traceability validation**: Verify all test cases link back to requirements
- **Historical comparison**: Compare current artifact against previous versions, detect regressions
- **Visual validation**: For Markdown artifacts, render and validate visual structure
- **Diff-based validation**: Only validate changed sections on incremental updates
- **Pipeline integration**: Integrate with CI/CD to block merges if validation fails
- **Real-time validation**: Validate artifacts as they are being written (streaming validation)
