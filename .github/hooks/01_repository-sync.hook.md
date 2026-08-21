# Repository Sync Hook

## Responsibility

Ensure the local workspace is synchronized with the remote repository before any Agent or Skill executes. Verify Git repository health, current branch state, detect uncommitted changes, and refresh workspace context to prevent stale artifact consumption or merge conflicts during execution.

## Trigger

- **Type**: Pre-Hook
- **Scope**: Global
- **Execution Point**: Before any Agent invocation

## Executes Before

- All Agents (unified-test-orchestrator, test-generator-ui, test-generator-api, unified-test-healer, jenkins-analyzer, epic-to-user-stories)
- All Skills (when invoked directly)

## Executes After

- Never (first hook in the execution pipeline)

## Inputs

- Current working directory path
- Target branch name (default: main/master, configurable via environment variable)
- Sync strategy: `auto` | `manual` | `skip` (default: auto)

## Outputs

- Repository status object:
  - `is_git_repository`: boolean
  - `current_branch`: string
  - `tracking_branch`: string | null
  - `uncommitted_changes`: boolean
  - `uncommitted_files`: string[]
  - `commits_ahead`: number
  - `commits_behind`: number
  - `merge_conflicts`: boolean
  - `last_commit_hash`: string
  - `last_commit_timestamp`: ISO 8601 timestamp
- Sync action taken: `pulled` | `skipped` | `none`
- Warning/error messages if applicable

## Internal Workflow

1. **Verify Git Repository**
   - Check `.git` directory exists
   - Validate repository is not corrupted (`git rev-parse --is-inside-work-tree`)
   - If not a Git repository: FAIL with error

2. **Identify Current Branch**
   - Execute `git branch --show-current`
   - If detached HEAD state: WARN and record commit SHA

3. **Check Local Changes**
   - Execute `git status --porcelain`
   - Parse output to identify:
     - Modified files (M)
     - Untracked files (??)
     - Staged files (A, R, D)
   - Record all uncommitted file paths

4. **Check Remote Tracking**
   - Execute `git rev-parse --abbrev-ref @{upstream}`
   - If no upstream: WARN (local-only branch)
   - If upstream exists: record tracking branch

5. **Compare Local vs Remote**
   - Execute `git fetch origin` (if tracking branch exists)
   - Execute `git rev-list --count HEAD..@{upstream}` (commits behind)
   - Execute `git rev-list --count @{upstream}..HEAD` (commits ahead)

6. **Detect Merge Conflicts**
   - Check for unmerged paths: `git diff --name-only --diff-filter=U`
   - If conflicts exist: FAIL immediately (never auto-merge)

7. **Execute Sync Strategy**
   - **auto**: If no local changes → `git pull --ff-only`
   - **auto**: If local changes exist → WARN, skip pull, continue
   - **manual**: WARN user to manually sync, continue
   - **skip**: No sync action, continue

8. **Refresh Workspace Context**
   - Re-scan workspace structure
   - Invalidate cached file listings
   - Update timestamp of last sync

## Validation Rules

| Rule | Condition | Severity |
|------|-----------|----------|
| Git repository exists | `.git` directory present | FAIL |
| Repository not corrupted | `git rev-parse` succeeds | FAIL |
| No merge conflicts | `git diff --diff-filter=U` empty | FAIL |
| Branch identified | `git branch --show-current` returns value or detached HEAD | WARN (detached) |
| No uncommitted changes before sync | `git status --porcelain` empty when sync=auto | WARN |
| Pull fast-forward only | `git pull --ff-only` succeeds when sync=auto | WARN (skip pull) |

## Failure Behaviour

| Failure Scenario | Action |
|------------------|--------|
| Not a Git repository | STOP execution, prompt user to initialize Git repository |
| Repository corrupted | STOP execution, prompt user to repair repository |
| Merge conflicts detected | STOP execution, provide conflict file list, instruct manual resolution |
| Pull failed (non-ff) | WARN, skip pull, continue execution, log advisory to sync manually |
| Network failure during fetch | WARN, continue without remote comparison, log network advisory |

## Retry Behaviour

- **Git fetch**: Retry once after 2-second delay on network timeout
- **Git pull**: No retry (manual intervention required if failed)
- **Git status**: Retry once on transient file lock errors

## Logging

**Start**:
```
[Repository Sync] Validating Git repository...
[Repository Sync] Current branch: <branch_name>
[Repository Sync] Tracking: <remote>/<branch>
```

**During**:
```
[Repository Sync] Uncommitted changes detected: <count> file(s)
[Repository Sync] Local is <n> commit(s) behind remote
[Repository Sync] Executing git pull...
```

**Success**:
```
[Repository Sync] ✓ Repository synchronized (pulled <n> commit(s))
[Repository Sync] ✓ Workspace context refreshed
```

**Warning**:
```
[Repository Sync] ⚠ Uncommitted changes present, skipping pull
[Repository Sync] ⚠ No upstream branch configured
```

**Failure**:
```
[Repository Sync] ✗ MERGE CONFLICTS detected in <file_list>
[Repository Sync] ✗ STOP: Resolve conflicts manually before proceeding
```

## Success Criteria

- Git repository validated (not corrupted)
- Current branch identified
- No merge conflicts exist
- Remote sync attempted (if strategy = auto and no local changes)
- Workspace context refreshed
- Repository status object populated and returned

## Future Extensions

- **Multi-remote support**: Sync from multiple remotes (origin, upstream)
- **Branch policy enforcement**: Prevent execution on protected branches (main, master) without confirmation
- **Pre-sync backup**: Create automatic stash before attempting pull
- **Submodule sync**: Recursively sync Git submodules (`git submodule update --init --recursive`)
- **LFS validation**: Verify Git LFS objects are current before execution
- **Commit signature verification**: Validate GPG signatures on recent commits
- **Workspace hygiene**: Detect and clean orphaned lock files (`.git/index.lock`)
- **Sync notifications**: Integrate with Slack/Teams to notify team of sync events
- **Artifact invalidation**: Automatically mark artifacts as stale if repository has new commits in relevant paths
