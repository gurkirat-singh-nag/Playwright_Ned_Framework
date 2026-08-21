# Workspace Validation Hook

## Responsibility

Verify the workspace structure, required files, templates, instructions, Skills, and Agents are complete and correctly organized before any execution begins. Prevent incomplete or misconfigured repository from causing execution failures mid-pipeline.

## Trigger

- **Type**: Pre-Hook
- **Scope**: Global
- **Execution Point**: After Repository Sync Hook, before any Agent invocation

## Executes Before

- All Agents (unified-test-orchestrator, test-generator-ui, test-generator-api, unified-test-healer, jenkins-analyzer, epic-to-user-stories)

## Executes After

- 01_repository-sync.hook.md

## Inputs

- Workspace root directory path
- Validation mode: `strict` | `relaxed` (default: strict)
- Required components manifest (auto-discovered from `.github/` structure)

## Outputs

- Validation result object:
  - `is_valid`: boolean
  - `missing_directories`: string[]
  - `missing_files`: string[]
  - `malformed_files`: string[]
  - `missing_agents`: string[]
  - `missing_skills`: string[]
  - `missing_instructions`: string[]
  - `warnings`: string[]
- Validation report summary

## Internal Workflow

1. **Verify Directory Structure**
   - Check required directories exist:
     - `.github/`
     - `.github/agents/`
     - `.github/skills/`
     - `.github/instructions/`
     - `.github/prompts/`
     - `.github/hooks/`
     - `artifacts/` (create if missing)
   - Record missing directories

2. **Verify Core Configuration Files**
   - Check existence:
     - `.github/copilot-instructions.md`
     - `.github/AGENTS.md` (optional, WARN if missing)
   - Validate YAML frontmatter in configuration files
   - Record missing or malformed files

3. **Discover and Validate Agents**
   - Scan `.github/agents/*.agent.md`
   - For each agent file:
     - Verify YAML frontmatter exists
     - Validate required frontmatter fields: `name`, `description`
     - Check `useTool` restrictions if present
   - Expected agents:
     - `unified-test-orchestrator.agent.md`
     - `test-generator-ui.agent.md`
     - `test-generator-api.agent.md`
     - `unified-test-healer.agent.md`
     - `jenkins-analyzer.agent.md`
     - `epic-to-user-stories.agent.md`
   - Record missing agents

4. **Discover and Validate Skills**
   - Scan `.github/skills/*/README.md` or `.github/skills/*/SKILL.md`
   - Expected skills:
     - `jira-story-analyzer`
     - `playwright-browser-exploration`
     - `api-contract-analyzer`
     - `test-plan-generator`
     - `test-case-documenter`
     - `page-object-generator`
     - `api-client-generator`
     - `test-script-generator`
     - `api-test-script-generator`
   - For each skill:
     - Verify README.md or SKILL.md exists
     - Validate YAML frontmatter (if present)
     - Check `inputs`, `outputs`, `workflow` sections exist
   - Record missing skills

5. **Discover and Validate Instructions**
   - Scan `.github/instructions/*.instructions.md`
   - Expected instructions:
     - `artifact-naming.instructions.md`
     - `artifact-schemas.instructions.md`
     - `coding-standards.instructions.md`
     - `naming.instructions.md`
     - `page-object.instructions.md`
     - `playwright.instructions.md`
   - For each instruction:
     - Verify YAML frontmatter exists
     - Validate `applyTo` patterns (if present)
   - Record missing instructions

6. **Verify Prompts Directory**
   - Scan `.github/prompts/*.prompt.md`
   - Validate YAML frontmatter in prompt files
   - Record malformed prompts

7. **Verify Hooks Directory**
   - Scan `.github/hooks/*.hook.md`
   - Expected hooks (self-discovery):
     - `01_repository-sync.hook.md`
     - `02_workspace-validation.hook.md`
     - `03_framework-discovery.hook.md`
     - `04_duplicate-detection.hook.md`
     - `05_artifact-validation.hook.md`
     - `06_output-quality-validation.hook.md`
     - `07_git-validation.hook.md`
     - `08_execution-summary.hook.md`
     - `09_error-handler.hook.md`
     - `10_cleanup.hook.md`
   - WARN if hooks are incomplete

8. **Validate Artifact Directory**
   - Check `artifacts/` directory exists
   - Verify write permissions
   - WARN if artifacts directory contains orphaned slugs (no recent modification)

9. **Generate Validation Report**
   - Summarize findings
   - Categorize by severity: CRITICAL, WARNING, INFO
   - Provide remediation guidance for each issue

## Validation Rules

| Rule | Condition | Severity |
|------|-----------|----------|
| Required directories exist | `.github/agents`, `.github/skills`, `.github/instructions` | FAIL |
| copilot-instructions.md exists | File present, valid Markdown | FAIL |
| All core Agents present | 6 expected agents found | FAIL (strict), WARN (relaxed) |
| All core Skills present | 9 expected skills found | FAIL (strict), WARN (relaxed) |
| All core Instructions present | 6 expected instructions found | FAIL (strict), WARN (relaxed) |
| Agent files valid | YAML frontmatter parseable | FAIL |
| Instruction files valid | YAML frontmatter parseable, applyTo valid glob | WARN |
| Artifacts directory writable | Write permission verified | FAIL |

## Failure Behaviour

| Failure Scenario | Action |
|------------------|--------|
| Missing required directory | STOP execution, list missing directories, provide setup instructions |
| Missing copilot-instructions.md | STOP execution, prompt user to restore core configuration |
| Missing Agent (strict mode) | STOP execution, list missing agents, link to repository template |
| Missing Skill (strict mode) | STOP execution, list missing skills, link to Skill definitions |
| Malformed YAML frontmatter | STOP execution, identify malformed file, provide YAML validation guidance |
| Artifacts directory not writable | STOP execution, check permissions, suggest remediation |
| Missing Agent (relaxed mode) | WARN, log missing component, continue execution |
| Missing Instruction | WARN, log missing file, continue execution with degraded guidance |

## Retry Behaviour

- **File existence checks**: No retry (file system operations are deterministic)
- **YAML parsing**: No retry (syntax errors require manual correction)
- **Directory creation**: Retry once after 500ms delay if transient filesystem lock detected

## Logging

**Start**:
```
[Workspace Validation] Validating workspace structure...
[Workspace Validation] Mode: <strict|relaxed>
```

**During**:
```
[Workspace Validation] Scanning .github/agents/...
[Workspace Validation] Found <n> agent(s)
[Workspace Validation] Scanning .github/skills/...
[Workspace Validation] Found <n> skill(s)
[Workspace Validation] Scanning .github/instructions/...
[Workspace Validation] Found <n> instruction(s)
```

**Success**:
```
[Workspace Validation] ✓ All required directories present
[Workspace Validation] ✓ All core Agents validated (6/6)
[Workspace Validation] ✓ All core Skills validated (9/9)
[Workspace Validation] ✓ All core Instructions validated (6/6)
[Workspace Validation] ✓ Workspace is complete and valid
```

**Warning**:
```
[Workspace Validation] ⚠ Missing instruction: <filename>
[Workspace Validation] ⚠ Orphaned artifact slugs detected: <list>
[Workspace Validation] ⚠ AGENTS.md not found (optional component)
```

**Failure**:
```
[Workspace Validation] ✗ Missing required directories: <list>
[Workspace Validation] ✗ Missing core Agents: <list>
[Workspace Validation] ✗ Malformed YAML in: <filename>
[Workspace Validation] ✗ STOP: Workspace is incomplete, cannot proceed
```

## Success Criteria

- All required directories exist
- Core configuration files (copilot-instructions.md) present and valid
- All expected Agents, Skills, and Instructions discovered (strict mode) or logged (relaxed mode)
- YAML frontmatter in all discovered files is valid
- Artifacts directory exists and is writable
- Validation report generated

## Future Extensions

- **Schema validation**: Validate Agent/Skill/Instruction files against JSON Schema
- **Version compatibility**: Check minimum required versions for Agents and Skills
- **Dependency graph**: Build dependency graph between Agents, Skills, and Instructions
- **Auto-repair**: Automatically create missing directories and download missing templates from canonical source
- **Health score**: Calculate workspace health score (0-100) based on completeness and validity
- **Migration detection**: Detect legacy structure and offer migration to current architecture
- **Remote validation**: Compare local workspace against remote template repository for drift detection
- **Custom validation rules**: Allow projects to define custom validation rules in `.github/validation-rules.yml`
- **IDE integration**: Export validation results in LSP-compatible format for IDE error highlighting
