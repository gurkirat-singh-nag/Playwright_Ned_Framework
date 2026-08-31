# Framework Discovery Hook

## Responsibility

Automatically detect the testing framework(s) in use within the workspace, identify configuration files, verify framework-specific dependencies, and produce a framework-analysis.md artifact that downstream Agents and Skills can consume to make framework-aware decisions.

## Trigger

- **Type**: Pre-Hook
- **Scope**: Global
- **Execution Point**: After Workspace Validation Hook, before Agent invocation

## Executes Before

- All Agents (central-automation-orchestrator, ui-automation-specialist, api-automation-specialist, unified-test-healer)

## Executes After

- 02_workspace-validation.hook.md

## Inputs

- Workspace root directory path
- Discovery scope: `full` | `incremental` (default: incremental, uses cached result if recent)
- Cache expiry duration: number of seconds (default: 3600 = 1 hour)

## Outputs

- Framework analysis object:
  - `ui_frameworks`: Array of detected UI frameworks
  - `api_frameworks`: Array of detected API frameworks
  - `backend_frameworks`: Array of detected backend frameworks
  - `build_tools`: Array of detected build tools
  - `package_managers`: Array of detected package managers
  - `language`: Primary programming language(s)
  - `config_files`: Map of framework → config file paths
  - `dependencies`: Map of framework → installed version
  - `missing_dependencies`: Array of unmet framework requirements
- Artifact: `framework-analysis.md` written to workspace root or `.github/`

## Internal Workflow

1. **Check Cache**
   - Look for existing `framework-analysis.md`
   - Check file modification timestamp
   - If cache valid and discovery scope = incremental: SKIP, return cached result
   - If cache stale or scope = full: Proceed with discovery

2. **Detect Programming Language**
   - Scan workspace for language-specific files:
     - TypeScript/JavaScript: `package.json`, `tsconfig.json`, `*.ts`, `*.js`
     - Java: `pom.xml`, `build.gradle`, `*.java`
     - Python: `requirements.txt`, `pyproject.toml`, `*.py`
     - C#: `*.csproj`, `*.sln`, `*.cs`
   - Record primary and secondary languages

3. **Detect UI Testing Frameworks**
   - **Playwright**:
     - Check: `package.json` contains `@playwright/test`
     - Config: `playwright.config.ts`, `playwright.config.js`
     - Record version from package.json
   - **Selenium**:
     - Check: `pom.xml` or `build.gradle` contains `selenium-java` or `package.json` contains `selenium-webdriver`
     - Config: Custom detection via common import patterns
     - Record version from dependency manifest
   - **Cypress**:
     - Check: `package.json` contains `cypress`
     - Config: `cypress.config.ts`, `cypress.config.js`, `cypress.json`
     - Record version from package.json
   - **Appium**:
     - Check: `package.json` or dependency manifest contains `appium`
     - Config: `appium.config.js`, custom capability files
     - Record version from package.json
   - **WebDriverIO**:
     - Check: `package.json` contains `@wdio/cli`
     - Config: `wdio.conf.ts`, `wdio.conf.js`
     - Record version from package.json

4. **Detect API Testing Frameworks**
   - **REST Assured**:
     - Check: `pom.xml` or `build.gradle` contains `rest-assured`
     - Config: N/A (library-based)
     - Record version from dependency manifest
   - **Axios/Fetch**:
     - Check: `package.json` contains `axios` or uses native fetch
     - Config: Custom client configuration
     - Record version if axios present
   - **Supertest**:
     - Check: `package.json` contains `supertest`
     - Config: N/A (library-based)
     - Record version from package.json
   - **Postman/Newman**:
     - Check: Presence of `*.postman_collection.json`
     - Config: Collection files
     - Record collection count
   - **Karate**:
     - Check: `pom.xml` contains `karate-core`
     - Config: `karate-config.js`
     - Record version from pom.xml

5. **Detect Backend Frameworks**
   - **Spring Boot**:
     - Check: `pom.xml` contains `spring-boot-starter`
     - Config: `application.properties`, `application.yml`
     - Record version from pom.xml
   - **Quarkus**:
     - Check: `pom.xml` contains `quarkus-` dependencies
     - Config: `application.properties`
     - Record version from pom.xml
   - **Express.js**:
     - Check: `package.json` contains `express`
     - Config: Custom detection via entry points
     - Record version from package.json
   - **ASP.NET Core**:
     - Check: `*.csproj` contains `Microsoft.AspNetCore`
     - Config: `appsettings.json`
     - Record version from .csproj

6. **Detect Build Tools**
   - **Maven**: `pom.xml` present
   - **Gradle**: `build.gradle`, `build.gradle.kts` present
   - **NPM**: `package.json` present, `package-lock.json` present
   - **Yarn**: `yarn.lock` present
   - **PNPM**: `pnpm-lock.yaml` present
   - **NuGet**: `*.csproj` with PackageReference

7. **Verify Configuration Files**
   - For each detected framework:
     - Search for canonical config file
     - Validate config file is parseable (JSON/YAML/TOML)
     - Record config file path
     - Extract key configuration properties (if applicable)

8. **Verify Dependencies Installed**
   - **Node.js projects**:
     - Check `node_modules/` contains expected framework directories
     - Compare package.json vs package-lock.json vs node_modules
   - **Java projects**:
     - Check `.m2/repository` or `~/.gradle/caches` for framework JARs
     - Attempt to resolve dependencies via build tool
   - Record missing dependencies

9. **Generate Framework Analysis Artifact**
   - Write `framework-analysis.md` with:
     - Detected frameworks (UI, API, Backend)
     - Configuration file locations
     - Installed versions
     - Missing dependencies
     - Recommended actions (install missing deps, upgrade versions)
     - Framework-specific best practices references
   - Structure:
     ```markdown
     # Framework Analysis
     Generated: <timestamp>
     
     ## UI Testing Frameworks
     - Playwright v<version> (config: <path>)
     
     ## API Testing Frameworks
     - REST Assured v<version> (no config file)
     
     ## Backend Frameworks
     - Spring Boot v<version> (config: application.yml)
     
     ## Build Tools
     - Maven v<version>
     
     ## Missing Dependencies
     - None
     
     ## Recommendations
     - Update Playwright to latest stable (v<latest>)
     ```

10. **Generate Class Index** (Simplified Architecture v3.0)
    - **Purpose**: Build the direct Page Object class/method index consulted before browser exploration - no business-capability abstraction layer.
    - **When**: After framework detection, before returning analysis object
    - **Process**:
      1. Check if `artifacts/indexes/_manifest.json` exists and is fresh (< 1 hour old)
      2. If stale or missing, run: `node .github/capabilities/generator.js`
      3. Scan `page-objects/` for Page Object classes (class name, file path, public methods, parameters, JSDoc description, constructor locators)
      4. Write per-class files to `artifacts/indexes/classes/<className>.json` and update `artifacts/indexes/_manifest.json`
      5. Do NOT generate `artifacts/indexes/capabilities/` or any business-capability abstraction file - the class index is the single source of reuse metadata
      6. Report statistics: classes found, methods extracted
    - **Benefits**:
      - ✅ Agents discover existing Page Objects/methods before Playwright MCP exploration
      - ✅ Eliminates duplicate Page Objects and redundant browser sessions
      - ✅ Lightweight, deterministic, regenerated directly from source (never accumulates stale entries)
    - **Outputs**:
      - `artifacts/indexes/_manifest.json`
      - `artifacts/indexes/classes/*.json`
      - Log: "✓ Class index generated (X classes, Y methods)"
    - **Error Handling**:
      - If generator fails: WARN, continue without a class index
      - Agents will fall back to full Playwright MCP exploration
    - **Documentation**: See `.github/hooks/02.5_intelligent-reuse-enforcement.hook.md` and `artifacts/validation/QUICK_REFERENCE.md`

10.5. **Enforce Class Index Usage**
    - **Purpose**: Ensure agents and Skills actually USE the generated class index before exploring.
    - **Process**:
      ```javascript
      const indexExists = fs.existsSync('artifacts/indexes/_manifest.json');

      if (!indexExists) {
        WARN: "Class index missing - regenerating...";
        runSync('node .github/capabilities/generator.js');

        if (!fs.existsSync('artifacts/indexes/_manifest.json')) {
          ERROR: "Failed to generate class index - falling back to full exploration";
          frameworkAnalysis.class_index_enabled = false;
        } else {
          frameworkAnalysis.class_index_enabled = true;
        }
      } else {
        frameworkAnalysis.class_index_enabled = true;
      }

      if (frameworkAnalysis.ui_frameworks.length > 0) {
        frameworkAnalysis.reuse_enforcement_required = true;
        frameworkAnalysis.next_hook = '02.5_intelligent-reuse-enforcement.hook.md';

        console.log('[Framework Discovery] ✓ Class index enabled');
        console.log('[Framework Discovery] ⚡ Next: Intelligent reuse enforcement hook will run before exploration');
      }
      ```

    - **Enforcement Rules**:
      - ✅ **Class index MUST exist** before an agent proceeds to generation
      - ✅ **Intelligent reuse enforcement hook MUST run** before browser exploration
      - ✅ **Agent MUST respect** the hook's recommendation (REUSE/PARTIAL/EXPLORE)
      - ⚠️ **Fallback allowed** only if index generation fails after retry

    - **Agent Contract**:
      ```javascript
      {
        ui_frameworks: [...],
        api_frameworks: [...],
        class_index_enabled: true,
        reuse_enforcement_required: true,
        class_index: {
          manifest: 'artifacts/indexes/_manifest.json',
          last_generated: '2026-08-21T00:51:35.431Z',
          stats: { classes: 4, methods: 46 }
        },
        next_hook: '02.5_intelligent-reuse-enforcement.hook.md'
      }
      ```

    - **Logging**:
      ```
      [Framework Discovery] Step 10.5: Enforcing class index usage...
      [Framework Discovery] ✓ Class index validated
      [Framework Discovery] ✓ Intelligent reuse enforcement hook scheduled
      [Framework Discovery] ⚡ Agents MUST invoke 02.5_intelligent-reuse-enforcement.hook.md before exploration
      ```

    - **Error Prevention**:
      - If agent skips the reuse enforcement hook: Pipeline WARNS but continues (logged for audit)
      - If agent ignores the enforcement recommendation: Logged as "reuse opportunity missed"

11. **Return Framework Analysis Object**
    - Populate structured object with discovery results
    - Include capability index metadata (if generated)
    - Make available to downstream hooks and agents

## Validation Rules

| Rule | Condition | Severity |
|------|-----------|----------|
| At least one framework detected | UI or API framework found | WARN (no frameworks) |
| Config files parseable | JSON/YAML validation succeeds | WARN |
| Dependencies installed | Framework present in node_modules or Maven cache | WARN |
| Version compatibility | Framework version meets minimum requirements | INFO |
| Multiple UI frameworks | More than one UI framework detected | INFO |
| No framework detected | Zero frameworks found | WARN |

## Failure Behaviour

| Failure Scenario | Action |
|------------------|--------|
| No frameworks detected | WARN, generate minimal framework-analysis.md, continue execution |
| Config file malformed | WARN, log parse error, continue execution |
| Missing dependencies | WARN, list missing deps in framework-analysis.md, suggest install command, continue |
| Cache read failure | WARN, proceed with full discovery |
| Artifact write failure | WARN, log error, continue execution (in-memory result still available) |

No scenario results in execution STOP. Framework discovery is advisory; Agents can still execute without it.

## Retry Behaviour

- **File reads**: Retry once after 200ms delay on transient file lock
- **Dependency resolution**: No retry (resolution failures are environmental)
- **Artifact write**: Retry once after 500ms delay on file lock

## Logging

**Start**:
```
[Framework Discovery] Scanning workspace for testing frameworks...
[Framework Discovery] Discovery scope: <full|incremental>
```

**During**:
```
[Framework Discovery] Detected language: TypeScript
[Framework Discovery] Found UI framework: Playwright v<version>
[Framework Discovery] Found API framework: REST Assured v<version>
[Framework Discovery] Config file located: playwright.config.ts
[Framework Discovery] Verifying dependencies...
```

**Success**:
```
[Framework Discovery] ✓ Detected 1 UI framework(s), 1 API framework(s)
[Framework Discovery] ✓ All required dependencies installed
[Framework Discovery] ✓ framework-analysis.md generated
```

**Warning**:
```
[Framework Discovery] ⚠ No UI testing framework detected
[Framework Discovery] ⚠ Missing dependency: @playwright/test@^1.40.0
[Framework Discovery] ⚠ Config file not found for: Cypress
[Framework Discovery] ⚠ Multiple UI frameworks detected (Playwright, Selenium) - may cause conflicts
```

**Info**:
```
[Framework Discovery] ℹ Using cached framework analysis (age: 15m)
[Framework Discovery] ℹ Playwright version outdated: v1.38.0 → v1.40.0 available
```

## Success Criteria

- Workspace scanned for framework indicators
- At least language detected (programming language)
- Framework analysis object populated and returned
- `framework-analysis.md` artifact written (if writable)
- No uncaught exceptions during discovery

## Future Extensions

- **Cloud provider detection**: AWS SDK, Azure SDK, GCP client libraries for cloud-based testing environments
- **Database framework detection**: Liquibase, Flyway, Entity Framework migrations
- **Containerization detection**: Dockerfile, docker-compose.yml, Kubernetes manifests
- **CI/CD integration detection**: Jenkins, GitHub Actions, GitLab CI, Azure DevOps pipeline files
- **Reporting framework detection**: Allure, ExtentReports, ReportPortal configurations
- **Performance testing detection**: JMeter, Gatling, k6, Locust
- **Security testing detection**: OWASP ZAP, Burp Suite, Snyk configurations
- **Version update recommendations**: Check registries (npm, Maven Central) for latest stable versions
- **License compliance**: Detect framework licenses and flag incompatibilities
- **Framework conflict detection**: Identify conflicting framework versions or duplicate functionality
- **Auto-install missing dependencies**: Offer to run `npm install`, `mvn install`, etc. on user confirmation
- **Framework migration assistant**: Suggest migration paths (e.g., Protractor → Playwright)
- **Custom framework registries**: Allow enterprises to register proprietary testing frameworks
