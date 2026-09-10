# Repo Convention Discovery

## Purpose

Read the actual, real source files in this repository - whatever language or framework they're written in - and record where Page Object / API client style classes and tests actually live, so that `framework-discovery` and the reuse layer stop having to guess.

`framework-discovery` (`.github/skills/framework-discovery/detect.js`) is deliberately limited to static evidence it can check without guessing: dependency manifests, config files, and one specific top-level folder name (`page-objects/`) this scaffold ships with by default. That default is real evidence for a project already shaped like this repo, but it is not evidence for any other shape - a Maven/Gradle Java project has no fixed top-level folder for this at all, and even a JS/TS project may call the folder `pages/` or `poms/` instead. Rather than encoding a growing list of per-framework folder names into `detect.js` (a guess that can never anticipate every team's actual convention), this Skill delegates that judgment to an agent that reads the real repo once and writes down what it finds - the same authorship model already used for `index/` (see `page-object.instructions.md`): agent-derived facts about a specific repo, not code trying to infer them from a fixed pattern.

## When It Should Be Invoked

- Once per project, during one-time scaffold adoption (see `ADOPTION.md` §3) - immediately alongside the calibration prompt that already deep-reads the repo's real conventions for `.github/instructions/*.instructions.md`. This is the same read pass; this Skill just also captures the two or three structural paths `framework-discovery` cannot safely guess.
- Again, whenever the project's actual source layout changes in a way that would make the recorded paths wrong (a folder rename, a migration from one language to another) - not on every run, and not automatically inferred as stale, since there is no static signature that captures "did a human reorganize the repo."

## Inputs

- The repository's real source tree - whatever Page Object / API client / test files already exist. Nothing to fabricate a story or requirement from; this Skill only looks at what's already on disk.
- `index/framework-profile.json`, if one already exists (for `language`/`uiFramework`/`apiFramework` context - read, not re-derived).

## Outputs

- Updates `index/framework-profile.json`'s `conventions` field in place (all other fields are untouched - this Skill does not re-run `framework-discovery`'s own detection):

```json
{
  "conventions": {
    "pageObjectsPath": "src/main/java/pageobjects",
    "apiClientsPath": "src/main/java/clients",
    "testsPath": "src/test/java"
  }
}
```

- Any path not actually found in this repo is omitted from the object rather than written as `"unknown"` - a missing key means "not established," which `framework-discovery`'s fallback logic already treats correctly as absence.

## Execution Steps

1. Read `index/framework-profile.json` if present, for `language`/`uiFramework`/`apiFramework` - this tells you what kind of source to look for, not where it lives.
2. Search the repository for real Page Object / API client style classes - not by assuming a folder name, but by reading actual files (e.g. classes with test-facing action methods, classes wrapping an HTTP client) wherever they are. For a JS/TS project this is typically fast (a handful of top-level candidates); for a Java Maven/Gradle project, look under `src/main/java` and `src/test/java` by package, not at the repo root.
3. Once you find genuine examples, record the actual containing folder (not a per-file path) for each of: Page Object equivalents, API client equivalents, and test/spec files.
4. Do NOT invent a path for a category that doesn't exist yet in this repo (e.g. a UI-only project has no `apiClientsPath`) - omit it, don't guess a conventional-sounding default.
5. Write the `conventions` object into `index/framework-profile.json`, preserving every other field already in that file untouched.
6. Show a summary of what was found (paths recorded, and any category left out because no evidence existed) before the caller reviews it.

## Relationship To `framework-discovery`

`framework-discovery` never calls this Skill and has no dependency on it running - it works standalone with its own honest fallback (checking for `page-objects/` at the repo root) when no `conventions` block exists yet, exactly as it did before this Skill existed. This Skill only adds a more accurate source of truth that `framework-discovery`'s `detectUiArchitecture()` / `detectApiArchitecture()` / `detectDirectories()` prefer when present. Re-running `node .github/skills/framework-discovery/detect.js --force` after this Skill writes `conventions` does not erase it - `buildProfile()` reads and carries forward the existing `conventions` block before regenerating everything else.

## Failure Handling

- No Page Object/API client examples exist anywhere in the repo (a genuinely brand-new project): write `conventions` as an empty object rather than blocking - `framework-discovery`'s fallback covers this case exactly as it did before.
- Repository is in a mixed/transitional state (e.g. mid-migration from JS to TS, two conventions coexisting): record what the majority of real, current files actually use; note the transitional state in the summary shown to the caller rather than silently picking one.

## Logging

- Log: paths recorded per category, and which categories were left out due to no evidence.
