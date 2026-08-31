# Duplicate Detection Hook

## Responsibility

Search the workspace for existing artifacts, tests, Page Objects, API clients, and utilities to prevent regeneration of identical or equivalent code. Recommend reuse of existing components and maintain a catalog of reusable assets for Agents and Skills to consult before generating new artifacts.

## Trigger

- **Type**: Pre-Hook (before generation)
- **Scope**: Generation Agents (ui-automation-specialist, api-automation-specialist)
- **Execution Point**: After Framework Discovery Hook, before Specialist Agent invokes generation Skills

## Executes Before

- ui-automation-specialist (before page-object-generator, test-script-generator)
- api-automation-specialist (before api-client-generator, api-test-script-generator)

## Executes After

- 03_framework-discovery.hook.md

## Inputs

- Target generation type: `page-object` | `test-script` | `api-client` | `test-case` | `utility`
- Target identifier (e.g., page name, endpoint URL, test scenario ID)
- Feature/module context (e.g., "Login", "User Management", "Payment API")
- Search scope: `workspace` | `project` | `module` (default: workspace)

## Outputs

- Duplicate detection result object:
  - `duplicates_found`: boolean
  - `exact_matches`: Array of file paths with 100% match confidence
  - `similar_matches`: Array of file paths with 60-99% match confidence
  - `reusable_utilities`: Array of utility file paths relevant to target
  - `recommendations`: Array of actionable recommendations
  - `similarity_scores`: Map of file path → similarity percentage
- Reuse catalog: Structured inventory of existing reusable components

## Internal Workflow

1. **Determine Search Strategy**
   - Based on target generation type:
     - **page-object**: Search `**/pageobjects/**/*.ts`, `**/pages/**/*.ts`, `**/pom/**/*.ts`
     - **test-script**: Search `**/tests/**/*.spec.ts`, `**/*.test.ts`
     - **api-client**: Search `**/clients/**/*.ts`, `**/api/**/*.ts`
     - **test-case**: Search `**/testcases.json`, `**/test-cases.md`
     - **utility**: Search `**/utils/**/*.ts`, `**/helpers/**/*.ts`

2. **Index Existing Artifacts**
   - Scan workspace for relevant files based on search strategy
   - For each file:
     - Extract metadata: file path, creation date, last modified date
     - Extract identifiers: class names, function names, constants
     - Extract domain keywords: parse comments, extract business terms
     - Compute file hash (SHA-256) for exact match detection
   - Build searchable index of existing artifacts

3. **Extract Target Context**
   - For target generation request:
     - **Page Object**: Extract page URL, page title, feature area
     - **Test Script**: Extract test scenario description, user story ID, feature
     - **API Client**: Extract endpoint URL, HTTP methods, resource name
     - **Utility**: Extract utility purpose, function signatures
   - Normalize identifiers (lowercase, remove special characters)

4. **Detect Exact Matches**
   - **Name-based exact match**:
     - Compare target identifier (e.g., "LoginPage") against existing class names
     - Match: exact string equality (case-insensitive)
   - **Hash-based exact match**:
     - Compare generated artifact hash (if previously generated and cached) against indexed hashes
   - **URL-based exact match** (for Page Objects and API clients):
     - Extract base URL from target
     - Compare against URLs extracted from existing artifacts
   - Record exact matches with 100% confidence

5. **Detect Similar Matches**
   - **Semantic similarity**:
     - Tokenize target identifier and existing identifiers
     - Compute Jaccard similarity: `|intersection| / |union|`
     - Example: "UserLoginPage" vs "LoginPage" → similarity 66%
   - **Feature area similarity**:
     - Compare feature/module context
     - Substring match or parent-child relationship
   - **Content similarity** (for test cases):
     - Extract test steps/assertions from target
     - Compare against existing test step patterns
     - Compute step overlap percentage
   - Record similar matches with 60-99% confidence

5.5. **Method-Level Duplicate Detection** ⭐ NEW
   - **Purpose**: Prevent regenerating methods that already exist in Page Objects
   - **Process**:
     ```javascript
     // Load class index
     const classIndex = loadIndex('artifacts/class-index.json');
     
     // Extract target methods from generation request
     const targetMethods = extractMethodsFromRequirement(target);
     
     // Search for each method in existing Page Objects
     const methodMatches = [];
     
     for (const targetMethod of targetMethods) {
       for (const [className, classData] of Object.entries(classIndex)) {
         for (const existingMethod of classData.methods) {
           
           // Method name exact match
           if (existingMethod.name.toLowerCase() === targetMethod.name.toLowerCase()) {
             methodMatches.push({
               match: 'exact',
               score: 100,
               targetMethod: targetMethod.name,
               existingClass: className,
               existingMethod: existingMethod.name,
               file: classData.file,
               params: existingMethod.params,
               description: existingMethod.description
             });
           }
           
           // Method signature similarity (name + params)
           else if (methodSignatureSimilar(targetMethod, existingMethod)) {
             const similarityScore = computeMethodSimilarity(targetMethod, existingMethod);
             
             if (similarityScore >= 70) {
               methodMatches.push({
                 match: 'similar',
                 score: similarityScore,
                 targetMethod: targetMethod.name,
                 existingClass: className,
                 existingMethod: existingMethod.name,
                 file: classData.file,
                 params: existingMethod.params,
                 description: existingMethod.description
               });
             }
           }
         }
       }
     }
     
     // Deduplicate and rank method matches
     const uniqueMethodMatches = deduplicateMethodMatches(methodMatches);
     ```
   
   - **Similarity Scoring**:
     - **Exact name match**: 100 points
     - **Name similarity** (Levenshtein distance): 0-70 points
       - `login` vs `userLogin` → 60 points
       - `assignLeave` vs `applyLeave` → 50 points
     - **Parameter match**: +20 points if params identical
     - **Purpose similarity** (from description/JSDoc): 0-10 points
   
   - **Recommendation Logic**:
     - **Score 100** (exact match): `REUSE existing method as-is`
     - **Score 80-99** (high similarity): `EXTEND existing method or refactor for shared use`
     - **Score 60-79** (moderate similarity): `REVIEW for potential reuse, may need wrapper`
     - **Score <60**: `CREATE new method`
   
   - **Example Output**:
     ```
     [Method-Level Detection] Target method: "assignLeave"
     [Method-Level Detection] ✓ Found exact match: assignLeavePage.assignLeave(leaveData)
     [Method-Level Detection] Recommendation: REUSE existing method
     [Method-Level Detection] File: page-objects/assignLeavePage.js
     [Method-Level Detection] Signature: async assignLeave(leaveData)
     [Method-Level Detection] ⚡ Skip generation, import existing method
     ```

6. **Identify Reusable Utilities**
   - Search utility directories for relevant helpers:
     - **For UI tests**: Locate navigation helpers, wait utilities, data generators
     - **For API tests**: Locate request builders, authentication utilities, response validators
   - Match utilities based on:
     - Keyword overlap (e.g., target mentions "authentication" → find `authHelper.ts`)
     - Functional pattern (e.g., target needs "wait for element" → find `waitUtils.ts`)
   - Record reusable utility file paths

7. **Build Recommendations**
   - **Exact match found (file or method-level)**:
     - Recommendation: "REUSE existing <artifact> at <path>"
     - Action: Do not regenerate, import/extend existing artifact
     - Method-specific: "REUSE method <className>.<methodName>() from <file>"
   - **Similar match found (>80% similarity)**:
     - Recommendation: "EXTEND existing <artifact> at <path> (similarity: <score>%)"
     - Action: Refactor existing artifact to support both use cases
     - Method-specific: "EXTEND method <methodName>() to support both use cases"
   - **Similar match found (60-80% similarity)**:
     - Recommendation: "REVIEW existing <artifact> at <path> for potential reuse (similarity: <score>%)"
     - Action: Manually review, decide reuse vs new artifact
     - Method-specific: "REVIEW method <methodName>() for potential wrapper creation"
   - **No match, reusable utilities found**:
     - Recommendation: "CREATE new <artifact>, REUSE utilities: <list>"
     - Action: Generate new artifact, import identified utilities
   - **No match, no utilities**:
     - Recommendation: "CREATE new <artifact>"
     - Action: Generate new artifact from scratch
   - **Method-level no match**:
     - Recommendation: "CREATE new method <methodName>() in <targetClass>"
     - Action: Add method to existing or new Page Object

8. **Update Reuse Catalog**
   - Persist reuse catalog to `.github/reuse-catalog.json`:
     ```json
     {
       "last_updated": "ISO-8601 timestamp",
       "page_objects": [
         {"name": "LoginPage", "path": "pageobjects/LoginPage.ts", "url": "/login", "keywords": ["authentication", "login"]}
       ],
       "api_clients": [
         {"name": "UserClient", "path": "clients/UserClient.ts", "endpoints": ["/api/users"], "keywords": ["user", "crud"]}
       ],
       "utilities": [
         {"name": "waitUtils", "path": "utils/waitUtils.ts", "functions": ["waitForElement", "waitForText"]}
       ]
     }
     ```
   - Incremental update: Append new entries, update existing entries on modification

9. **Return Duplicate Detection Result**
   - Populate duplicate detection result object
   - Log findings summary
   - Make recommendations available to downstream Skills

## Validation Rules

| Rule | Condition | Severity |
|------|-----------|----------|
| Index build successful | Workspace scan completes | INFO |
| Exact match found | 100% similarity detected | INFO |
| High similarity match | >80% similarity detected | INFO |
| Ambiguous matches | Multiple similar matches with close scores | WARN |
| Catalog outdated | Reuse catalog older than 24 hours | INFO |

## Failure Behaviour

| Failure Scenario | Action |
|------------------|--------|
| Workspace scan failure | WARN, return empty duplicate detection result, continue execution |
| Catalog read failure | WARN, rebuild catalog from scratch, continue |
| Catalog write failure | WARN, log error, continue execution (in-memory catalog still functional) |
| File hash computation error | WARN, skip hash-based detection for that file, continue |

No scenario results in execution STOP. Duplicate detection is advisory; generation can proceed without it.

## Retry Behaviour

- **File reads**: Retry once after 200ms delay on transient file lock
- **Catalog write**: Retry once after 500ms delay on file lock
- **Workspace scan**: No retry (scan failures indicate environmental issues)

## Logging

**Start**:
```
[Duplicate Detection] Searching for existing artifacts...
[Duplicate Detection] Target: <generation_type> (<identifier>)
[Duplicate Detection] Search scope: <workspace|project|module>
```

**During**:
```
[Duplicate Detection] Indexing existing page objects...
[Duplicate Detection] Found <n> existing page object(s)
[Duplicate Detection] Indexing existing utilities...
[Duplicate Detection] Computing similarity scores...
```

**Success**:
```
[Duplicate Detection] ✓ Exact match found: <path>
[Duplicate Detection] ✓ Recommendation: REUSE existing artifact
```

**Info**:
```
[Duplicate Detection] ℹ Similar match found: <path> (similarity: <score>%)
[Duplicate Detection] ℹ Reusable utilities identified: <count>
[Duplicate Detection] ℹ No duplicates found, safe to generate new artifact
```

**Warning**:
```
[Duplicate Detection] ⚠ Multiple similar matches found, manual review recommended
[Duplicate Detection] ⚠ Reuse catalog outdated, rebuilding...
[Duplicate Detection] ⚠ Workspace scan failed, skipping duplicate detection
```

## Success Criteria

- Workspace scanned for relevant artifacts (or scan attempt made)
- Target context extracted and normalized
- Similarity analysis performed
- Duplicate detection result object populated and returned
- Recommendations generated
- Reuse catalog updated (or update attempted)

## Future Extensions

- **Machine learning similarity**: Train ML model on historical artifact pairs to improve similarity scoring
- **Cross-repository search**: Search multiple repositories/workspaces for reusable artifacts
- **Dependency graph analysis**: Detect transitive dependencies between artifacts to recommend co-reuse
- **Usage analytics**: Track which artifacts are most frequently reused to prioritize indexing
- **Auto-refactoring**: Automatically extract common patterns into shared utilities
- **Visual similarity**: For Page Objects, compare screenshots to detect visually similar pages
- **API contract diffing**: Compare OpenAPI specs to detect endpoint overlap
- **Test coverage overlap**: Detect test cases covering identical user flows
- **Versioning support**: Track artifact versions and recommend appropriate version for reuse
- **Deduplication suggestions**: Identify identical artifacts with different names and suggest consolidation
- **Reuse metrics dashboard**: Generate report of reuse rate, duplicate count, coverage gaps
- **Integration with code review**: Automatically comment on PRs when duplicates are introduced
- **Semantic code search**: Use embeddings to find functionally equivalent code (not just syntactically similar)
- **License compatibility check**: Ensure reused artifacts have compatible licenses
