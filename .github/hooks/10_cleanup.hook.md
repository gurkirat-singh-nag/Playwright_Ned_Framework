# Cleanup Hook

## Responsibility

Archive temporary files, remove transient artifacts, organize generated deliverables into proper directory structure, and preserve important execution artifacts while maintaining workspace hygiene. Ensure clean workspace state after execution completes.

## Trigger

- **Type**: Post-Hook (final hook)
- **Scope**: Global
- **Execution Point**: After Execution Summary Hook, at end of all execution

## Executes Before

- Nothing (final hook in pipeline)

## Executes After

- 08_execution-summary.hook.md
- All other hooks and execution components

## Inputs

- Execution context object:
  - Execution status: success | partial_success | failure
  - Artifacts produced: Array of file paths
  - Temporary files created: Array of temp file paths
  - Cleanup mode: `aggressive` | `standard` | `minimal` | `none` (default: standard)
- Retention policy:
  - Archive temporary files: boolean (default: true)
  - Delete build artifacts: boolean (default: false)
  - Preserve error logs: boolean (default: true)
  - Days to retain archives: number (default: 30)

## Outputs

- Cleanup result object:
  - `files_archived`: Array of file paths moved to archive
  - `files_deleted`: Array of file paths removed
  - `files_preserved`: Array of file paths kept in workspace
  - `disk_space_freed`: Size in bytes
  - `cleanup_duration`: Seconds
  - `warnings`: Array of cleanup warnings (e.g., file not found, permission denied)
- Cleanup summary: Brief report of cleanup actions

## Internal Workflow

1. **Identify Temporary Files**
   
   **Standard temporary files**:
   - `*.tmp`, `*.temp`
   - `.cache/`, `cache/`
   - `node_modules/.cache/`
   - `.tsbuildinfo`
   - `*.log` (except error-log.md, execution logs)
   - `*.swp`, `*.swo` (Vim swap files)
   - `.DS_Store` (macOS)
   - `Thumbs.db` (Windows)
   
   **Framework-specific temporary files**:
   - **Playwright**: `test-results/` (if not preserving), `.playwright/`
   - **Jest**: `coverage/` (if not preserving)
   - **Maven**: `target/` (if not preserving)
   - **Gradle**: `build/` (if not preserving)
   
   **Execution-specific temporary files**:
   - Intermediate artifacts from failed Skill executions
   - Duplicate detection cache entries older than 24 hours
   - Framework discovery cache older than 1 hour
   - Validation reports older than 7 days (unless tied to active artifact)

2. **Identify Deliverables to Preserve**
   
   **Always preserve**:
   - Final artifacts in `artifacts/<slug>/`:
     - `requirements.md`
     - `exploration.md`, `api-exploration.md`
     - `test-plan.md`
     - `test-cases.md`, `testcases.json`
     - Page Objects (`pageobjects/`)
     - API clients (`clients/`)
     - Test specs (`tests/`)
   - `execution-summary.md`
   - `error-log.md` (if errors occurred)
   - `framework-analysis.md` (if generated)
   
   **Preserve based on execution status**:
   - **Success**: Keep quality-report.md, pre-commit-validation.md for review
   - **Partial success**: Keep all validation reports for debugging
   - **Failure**: Keep all intermediate artifacts for troubleshooting
   
   **Preserve based on retention policy**:
   - Validation reports: Keep for 7 days
   - Execution summaries: Keep for 30 days
   - Error logs: Keep indefinitely
   - Test results: Keep for 14 days

3. **Archive Temporary Files** (if archive enabled)
   
   - Create archive directory structure:
     ```
     .github/
       archives/
         <execution-id>/
           temp/
           validation-reports/
           execution-summary.md
     ```
   
   - Move temporary files to archive:
     - Validation reports → `archives/<execution-id>/validation-reports/`
     - Intermediate artifacts → `archives/<execution-id>/temp/`
     - Execution summary → `archives/<execution-id>/execution-summary.md`
   
   - Compress archive (if cleanup mode = aggressive):
     - Create `.github/archives/<execution-id>.tar.gz`
     - Delete uncompressed archive directory
   
   - Maintain archive retention:
     - Scan `archives/` for entries older than retention period
     - Delete archives older than retention threshold (default: 30 days)

4. **Delete Temporary Files** (if archive disabled or cleanup mode = aggressive)
   
   - Delete identified temporary files:
     - Use safe deletion (verify file exists before deletion)
     - Log each deletion
     - Track disk space freed
   
   - Delete empty directories:
     - After file deletion, remove empty parent directories
     - Example: If `artifacts/temp-slug/` is empty, remove directory

5. **Organize Deliverables**
   
   - **Verify artifact directory structure**:
     ```
     artifacts/
       <slug>/
         requirements.md
         exploration.md
         test-plan.md
         test-cases.md
         testcases.json
         pageobjects/
           LoginPage.ts
           DashboardPage.ts
         tests/
           login-valid-credentials.spec.ts
     ```
   
   - **Move misplaced files** (if any):
     - If artifacts generated in workspace root: Move to `artifacts/<slug>/`
     - If Page Objects in wrong directory: Move to `artifacts/<slug>/pageobjects/`
   
   - **Create README.md** (if not exists):
     - Generate README.md in `artifacts/<slug>/` with:
       - Artifact overview
       - Generation timestamp
       - Source (Jira ID, URL, user story)
       - File index (list of all artifacts with descriptions)

6. **Clean Up Version Control Artifacts**
   
   - **Remove Git ignored files** (if cleanup mode = aggressive):
     - Parse `.gitignore`
     - Delete files matching ignore patterns (except preserved deliverables)
   
   - **Clean untracked files** (if cleanup mode = aggressive):
     - Execute `git clean -fdX` (dry-run first to preview)
     - Exclude preserved deliverables from clean
   
   - **Reset file permissions** (if on Unix):
     - Ensure generated files have consistent permissions (644 for files, 755 for directories)
     - Remove execute permission from non-executable files

7. **Clean Up Build Artifacts** (if enabled and cleanup mode = aggressive)
   
   - **Node.js**:
     - Delete `node_modules/.cache/`
     - Delete `.tsbuildinfo`
     - Preserve `node_modules/` itself (unless explicitly requested)
   
   - **Java**:
     - Delete `target/` (Maven)
     - Delete `build/` (Gradle)
     - Preserve compiled test classes if tests passed
   
   - **Python**:
     - Delete `__pycache__/`
     - Delete `*.pyc`, `*.pyo`
     - Delete `.pytest_cache/`

8. **Clean Up Test Results** (based on execution status)
   
   - **If tests passed**:
     - Archive test results to `archives/<execution-id>/test-results/`
     - Delete test result HTML reports from workspace
     - Keep JUnit XML results for CI integration
   
   - **If tests failed**:
     - Preserve all test results in workspace for debugging
     - Keep screenshots, videos, trace files
     - Do not delete or archive
   
   - **If tests not run**:
     - Delete stale test results from previous executions (older than 7 days)

9. **Update Cleanup Metadata**
   
   - Write cleanup metadata to `.github/cleanup-metadata.json`:
     ```json
     {
       "last_cleanup": "2026-08-06T14:35:00Z",
       "execution_id": "exec-20260806-143022-a7b3",
       "files_archived": 15,
       "files_deleted": 42,
       "disk_space_freed_bytes": 12582912,
       "cleanup_mode": "standard",
       "next_archive_purge": "2026-09-05T14:35:00Z"
     }
     ```
   
   - Track cleanup history for audit trail

10. **Validate Cleanup**
    
    - **Verify deliverables intact**:
      - Check all preserved files still exist
      - Verify file sizes unchanged (no corruption during move)
      - Verify artifact directory structure correct
    
    - **Verify workspace hygiene**:
      - No orphaned temporary files remaining
      - No empty directories (except intentional structure)
      - `.gitignore` patterns respected
    
    - **Verify archive integrity** (if archived):
      - Check archive directory exists
      - Verify archived files readable
      - If compressed, test archive integrity (gunzip -t)

11. **Generate Cleanup Summary**
    
    ```
    Cleanup Summary:
    - Files archived: 15
    - Files deleted: 42
    - Disk space freed: 12.0 MB
    - Cleanup duration: 2.3s
    - Deliverables preserved: 14
    - Archives older than 30 days purged: 3
    ```

12. **Return Cleanup Result Object**
    - Populate cleanup result object
    - Log summary
    - Execution complete

## Validation Rules

No validation rules - cleanup is best-effort, failures do not block execution completion.

## Failure Behaviour

| Failure Scenario | Action |
|------------------|--------|
| File deletion permission denied | WARN, log file path, skip deletion, continue |
| Archive directory creation failed | WARN, skip archiving, continue with deletion |
| Compression failed | WARN, keep uncompressed archive, continue |
| File not found during deletion | INFO, file already deleted, continue |
| Disk full during archiving | WARN, skip archiving, attempt deletion instead |
| Cleanup metadata write failed | WARN, log error, continue (cleanup still executed) |

All failures are logged as warnings. Cleanup is best-effort; failures do not prevent execution completion.

## Retry Behaviour

- **File deletion**: Retry once after 500ms delay on file lock
- **Directory creation**: Retry once after 200ms delay on transient failure
- **Archive compression**: No retry (compression failures are environmental)
- **Metadata write**: Retry once after 500ms delay on file lock

## Logging

**Start**:
```
[Cleanup] Starting workspace cleanup...
[Cleanup] Cleanup mode: <aggressive|standard|minimal|none>
[Cleanup] Execution status: <success|partial_success|failure>
```

**During**:
```
[Cleanup] Identifying temporary files...
[Cleanup] Found <n> temporary file(s)
[Cleanup] Archiving temporary files to archives/<execution-id>/...
[Cleanup] Deleting temporary files...
[Cleanup] Organizing deliverables...
[Cleanup] Validating cleanup...
```

**Success**:
```
[Cleanup] ✓ Files archived: <n>
[Cleanup] ✓ Files deleted: <n>
[Cleanup] ✓ Disk space freed: <size> MB
[Cleanup] ✓ Deliverables preserved: <n>
[Cleanup] ✓ Cleanup complete in <duration>s
```

**Warning**:
```
[Cleanup] ⚠ Permission denied: Cannot delete <file>
[Cleanup] ⚠ Archive creation failed, skipping archiving
[Cleanup] ⚠ File not found: <file> (already deleted)
```

**Info**:
```
[Cleanup] ℹ Cleanup mode: none (skipping cleanup)
[Cleanup] ℹ Execution failed, preserving all artifacts for debugging
[Cleanup] ℹ Purged <n> old archive(s) (>30 days)
```

## Success Criteria

- Temporary files identified (or attempted)
- Archiving performed (if enabled and mode ≠ none)
- Deletion performed (if enabled and mode ≠ none)
- Deliverables verified intact
- Cleanup result object populated and returned
- Workspace in clean state (or best-effort achieved)

## Future Extensions

- **Smart compression**: Use appropriate compression (gzip, bzip2, xz) based on file types
- **Cloud archive**: Upload archives to cloud storage (S3, Azure Blob, GCS)
- **Incremental archiving**: Only archive files changed since last execution
- **Selective cleanup**: Allow users to specify which artifacts to preserve/delete via configuration
- **Disk quota management**: Monitor disk usage, trigger cleanup when quota exceeded
- **Automated cleanup scheduling**: Run cleanup on schedule (daily, weekly) independent of execution
- **Cleanup policies by project**: Different retention policies for different projects
- **Artifact versioning**: Maintain multiple versions of artifacts, delete old versions
- **Cleanup preview**: Dry-run mode to preview cleanup actions before execution
- **Cleanup rollback**: Ability to restore archived files if needed
- **Cleanup metrics**: Track cleanup effectiveness (disk space trends, archive growth)
- **Integration with CI/CD**: Trigger cleanup as CI post-build step
- **Cleanup notifications**: Notify team when large cleanup performed or archives purged
- **Forensic preservation**: Preserve all artifacts for failed executions indefinitely for troubleshooting
- **Compliance mode**: Ensure cleanup complies with data retention regulations
- **Cleanup audit log**: Maintain immutable log of all cleanup actions for compliance
- **Custom cleanup scripts**: Allow projects to define custom cleanup logic via scripts
- **Workspace health monitoring**: Detect workspace bloat, recommend cleanup
- **Artifact deduplication**: Detect duplicate artifacts across slugs, consolidate storage
