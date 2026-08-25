#!/usr/bin/env node

/**
 * Test Validator - deterministic checks
 *
 * Backs the objectively-checkable parts of the Test Validator Skill (see README.md):
 * JSON/schema integrity, duplicate scenario ID detection, AC cross-reference
 * integrity, near-duplicate scenario title detection, technology-vs-framework-profile
 * consistency, and informational (non-deciding) existing-capability awareness.
 *
 * Does NOT judge scenario quality/vagueness, requirement consistency, or risk
 * quality - those require reading requirements.md's prose alongside the design
 * and are the reasoning half of this Skill, applied by the invoking agent per
 * the rules in README.md, not by this script.
 *
 * Usage:
 *   node .github/skills/test-validator/validate.js <slug>
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');

function readJsonSafe(relPath) {
  const fullPath = path.join(WORKSPACE_ROOT, relPath);
  if (!fs.existsSync(fullPath)) return { exists: false };
  try {
    return { exists: true, valid: true, data: JSON.parse(fs.readFileSync(fullPath, 'utf-8')) };
  } catch (e) {
    return { exists: true, valid: false, error: e.message };
  }
}

/** Minimal draft-07-ish structural check: required fields, additionalProperties, enums. Not a full JSON Schema implementation - sufficient for this repo's schemas. */
function validateAgainstSchema(doc, schema, pathLabel = '$') {
  const errors = [];

  function checkObject(obj, def, label) {
    if (def.required) {
      for (const key of def.required) {
        if (!(key in obj)) errors.push(`${label}: missing required property "${key}"`);
      }
    }
    if (def.additionalProperties === false && def.properties) {
      for (const key of Object.keys(obj)) {
        if (!(key in def.properties)) errors.push(`${label}: unexpected property "${key}"`);
      }
    }
    if (def.properties) {
      for (const [key, propDef] of Object.entries(def.properties)) {
        if (!(key in obj)) continue;
        checkValue(obj[key], propDef, `${label}.${key}`);
      }
    }
  }

  function checkValue(value, def, label) {
    if (def.$ref) {
      const refName = def.$ref.replace('#/definitions/', '');
      def = schema.definitions[refName];
    }
    if (def.enum && !def.enum.includes(value)) {
      errors.push(`${label}: value "${value}" not in enum [${def.enum.join(', ')}]`);
    }
    if (def.oneOf) {
      const matches = def.oneOf.some(sub => {
        if (sub.type === 'boolean') return typeof value === 'boolean';
        if (sub.const !== undefined) return value === sub.const;
        return false;
      });
      if (!matches) errors.push(`${label}: value does not match any oneOf branch`);
    }
    if (def.pattern && typeof value === 'string' && !new RegExp(def.pattern).test(value)) {
      errors.push(`${label}: "${value}" does not match pattern ${def.pattern}`);
    }
    if (def.type === 'object' && value && typeof value === 'object') {
      checkObject(value, def, label);
    }
    if (def.type === 'array' && Array.isArray(value) && def.items) {
      value.forEach((item, i) => checkValue(item, def.items, `${label}[${i}]`));
    }
  }

  checkObject(doc, schema, pathLabel);
  return errors;
}

function checkArtifactIntegrity(slug) {
  const issues = [];
  const artifactsDir = `artifacts/${slug}`;

  // test-design.json - primary input, must exist and be valid
  const designSchema = readJsonSafe('.github/schemas/test-design.schema.json');
  const design = readJsonSafe(`${artifactsDir}/test-design.json`);

  if (!design.exists) {
    issues.push({ severity: 'BLOCKER', category: 'artifact-integrity', file: `${artifactsDir}/test-design.json`,
      description: 'test-design.json does not exist - Test Validator cannot run without its primary input.' });
    return { issues, design: null };
  }
  if (!design.valid) {
    issues.push({ severity: 'BLOCKER', category: 'artifact-integrity', file: `${artifactsDir}/test-design.json`,
      description: `ARTIFACT INTEGRITY FAILURE: invalid JSON - ${design.error}`,
      recommendation: 'Do not repair automatically. Re-run Test Architect to regenerate this file.' });
    return { issues, design: null };
  }

  const schemaErrors = validateAgainstSchema(design.data, designSchema.data);
  schemaErrors.forEach(err => issues.push({
    severity: 'BLOCKER', category: 'artifact-integrity', file: `${artifactsDir}/test-design.json`,
    description: `Schema violation: ${err}`
  }));

  // Duplicate scenario IDs
  const ids = design.data.scenarios.map(s => s.id);
  const seen = new Set();
  const dupes = new Set();
  ids.forEach(id => { if (seen.has(id)) dupes.add(id); seen.add(id); });
  dupes.forEach(id => issues.push({
    severity: 'BLOCKER', category: 'artifact-integrity',
    description: `Duplicate scenario ID "${id}" - scenario IDs must be unique.`
  }));

  // AC cross-reference integrity
  const acIds = new Set(design.data.acceptanceCriteria.map(a => a.id));
  design.data.scenarios.forEach(s => {
    s.acceptanceCriteria.forEach(ac => {
      if (!acIds.has(ac)) issues.push({
        severity: 'BLOCKER', category: 'artifact-integrity', scenarioId: s.id,
        description: `Scenario ${s.id} references unknown acceptance criterion "${ac}" (invalid AC reference).`
      });
    });
  });

  // Coverage array consistency
  const scenarioAcIds = new Set(design.data.scenarios.flatMap(s => s.acceptanceCriteria));
  design.data.coverage.coveredAcceptanceCriteria.forEach(ac => {
    if (!scenarioAcIds.has(ac)) issues.push({
      severity: 'BLOCKER', category: 'artifact-integrity',
      description: `coverage.coveredAcceptanceCriteria claims "${ac}" is covered, but no scenario references it.`
    });
  });

  // Other pipeline artifacts, if present for this slug - same integrity bar applies
  const testcasesSchema = readJsonSafe('.github/schemas/testcases.schema.json');
  const testcases = readJsonSafe(`${artifactsDir}/testcases.json`);
  if (testcases.exists && !testcases.valid) {
    issues.push({
      severity: 'BLOCKER', category: 'artifact-integrity', file: `${artifactsDir}/testcases.json`,
      description: `ARTIFACT INTEGRITY FAILURE: invalid JSON - ${testcases.error}`,
      recommendation: 'Do not repair automatically. Report to the invoking agent; regenerate via Test Case Documenter once test-design.json is corrected.'
    });
  } else if (testcases.exists && testcases.valid && testcasesSchema.valid) {
    const tcErrors = validateAgainstSchema(testcases.data, testcasesSchema.data);
    if (tcErrors.length > 0) {
      issues.push({
        severity: 'WARNING', category: 'artifact-integrity', file: `${artifactsDir}/testcases.json`,
        description: `testcases.json does not conform to testcases.schema.json (${tcErrors.length} violation(s)) - existing artifact, not produced by Test Validator.`,
        recommendation: 'Reported, not repaired. See testcases.schema.json for the expected shape.'
      });
    }
  }

  return { issues, design: design.data };
}

/** Jaccard token similarity - same technique 04_duplicate-detection.hook.md uses for artifact-name similarity, applied here to scenario titles instead of file/class names (a different problem: scenario-text overlap, not code-file overlap - no existing scenario-level detector exists in this repo to reuse instead). */
function tokenize(text) {
  return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean));
}

function jaccardSimilarity(a, b) {
  const setA = tokenize(a);
  const setB = tokenize(b);
  const intersection = [...setA].filter(t => setB.has(t)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : Math.round((intersection / union) * 100);
}

function detectDuplicateScenarios(scenarios) {
  const issues = [];
  for (let i = 0; i < scenarios.length; i++) {
    for (let j = i + 1; j < scenarios.length; j++) {
      const score = jaccardSimilarity(scenarios[i].title, scenarios[j].title);
      if (score >= 90) {
        issues.push({ severity: 'WARNING', category: 'duplicate', scenarioId: scenarios[i].id,
          description: `${scenarios[i].id} and ${scenarios[j].id} titles are ${score}% similar - likely duplicate ("${scenarios[i].title}" vs "${scenarios[j].title}").`,
          recommendation: 'Not deleted automatically - review whether these represent meaningfully different coverage.' });
      } else if (score >= 60) {
        issues.push({ severity: 'WARNING', category: 'duplicate', scenarioId: scenarios[i].id,
          description: `${scenarios[i].id} and ${scenarios[j].id} titles are ${score}% similar - probable duplicate ("${scenarios[i].title}" vs "${scenarios[j].title}").`,
          recommendation: 'Review for overlap before generation.' });
      }
    }
  }
  return issues;
}

function checkTechnologyConsistency(scenarios, frameworkProfile) {
  const issues = [];
  if (!frameworkProfile) {
    issues.push({ severity: 'WARNING', category: 'technology-consistency',
      description: 'framework-profile.json unavailable - technology consistency could not be checked.' });
    return issues;
  }
  scenarios.forEach(s => {
    if ((s.technology === 'UI' || s.technology === 'both') &&
        (frameworkProfile.uiFramework === 'none' || frameworkProfile.uiFramework === 'unknown')) {
      issues.push({ severity: 'WARNING', category: 'technology-consistency', scenarioId: s.id,
        description: `Scenario ${s.id} is classified technology="${s.technology}", but framework-profile.json reports uiFramework="${frameworkProfile.uiFramework}" - no UI automation capability detected in this repository.` });
    }
    if ((s.technology === 'API' || s.technology === 'both') &&
        (frameworkProfile.apiFramework === 'none' || frameworkProfile.apiFramework === 'unknown')) {
      issues.push({ severity: 'WARNING', category: 'technology-consistency', scenarioId: s.id,
        description: `Scenario ${s.id} is classified technology="${s.technology}", but framework-profile.json reports apiFramework="${frameworkProfile.apiFramework}" - no API automation capability detected in this repository.` });
    }
  });
  return issues;
}

/** Informational only - reports a support-level hint per scenario. Never decides REUSE/PARTIAL/EXPLORE; that stays 02.5_intelligent-reuse-enforcement.hook.md's job. */
function checkExistingCapabilityAwareness(scenarios) {
  const issues = [];
  let searcher;
  try {
    const { ClassIndexSearch } = require('../../capabilities/search-simplified.js');
    searcher = new ClassIndexSearch({ verbose: false });
  } catch {
    issues.push({ severity: 'INFO', category: 'existing-automation-awareness',
      description: 'Class index unavailable - existing-automation awareness skipped (informational only, not a blocker).' });
    return issues;
  }

  scenarios.forEach(s => {
    const coverage = searcher.analyzeReuseCoverage(s.steps, { minConfidence: 60 });
    let label;
    if (coverage.coveragePercentage === 100) label = 'appears fully supported';
    else if (coverage.coveragePercentage > 0) label = 'appears partially supported';
    else label = 'no known implementation';
    issues.push({ severity: 'INFO', category: 'existing-automation-awareness', scenarioId: s.id,
      description: `${s.id}: ${label} (${coverage.coveragePercentage}% of steps match existing methods) - informational only, not a resolved reuse decision.` });
  });
  return issues;
}

function checkTestData(scenarios, consolidatedTestData) {
  const issues = [];

  // Scenario-level free-text mentions of unresolved data
  scenarios.forEach(s => {
    (s.testData || []).forEach(td => {
      if (/unresolved/i.test(td)) {
        const severity = s.automationCandidate === true ? 'BLOCKER' : 'WARNING';
        issues.push({ severity, category: 'test-data', scenarioId: s.id,
          description: `${s.id} has unresolved test data ("${td}")${severity === 'BLOCKER' ? ' and is marked automationCandidate=true - generation would be impossible without it.' : '.'}` });
      }
    });
  });

  // Structured top-level testData entries with unresolved: true - attribute to the
  // specific automation-candidate scenario it affects via text overlap, when possible.
  (consolidatedTestData || []).forEach(td => {
    if (!td.unresolved) return;

    const affectedCandidate = scenarios.find(s =>
      s.automationCandidate === true &&
      jaccardSimilarity(td.description, [...(s.testData || []), ...s.steps].join(' ')) >= 15
    );

    if (affectedCandidate) {
      issues.push({ severity: 'BLOCKER', category: 'test-data', scenarioId: affectedCandidate.id,
        description: `Test data dependency unresolved: "${td.description}" - appears required by ${affectedCandidate.id}, which is marked automationCandidate=true.` });
    } else {
      issues.push({ severity: 'WARNING', category: 'test-data',
        description: `Test data dependency unresolved: "${td.description}".` });
    }
  });

  return issues;
}

function run(slug) {
  const { issues: integrityIssues, design } = checkArtifactIntegrity(slug);
  const issues = [...integrityIssues];

  if (design) {
    const frameworkProfile = readJsonSafe('artifacts/indexes/framework-profile.json');
    issues.push(...detectDuplicateScenarios(design.scenarios));
    issues.push(...checkTechnologyConsistency(design.scenarios, frameworkProfile.valid ? frameworkProfile.data : null));
    issues.push(...checkExistingCapabilityAwareness(design.scenarios));
    issues.push(...checkTestData(design.scenarios, design.testData));
  }

  const summary = {
    blockers: issues.filter(i => i.severity === 'BLOCKER').length,
    warnings: issues.filter(i => i.severity === 'WARNING').length,
    info: issues.filter(i => i.severity === 'INFO').length
  };

  const status = summary.blockers > 0 ? 'BLOCKED' : (summary.warnings > 0 ? 'PASS_WITH_WARNINGS' : 'PASS');

  return { status, summary, issues, design };
}

if (require.main === module) {
  const slug = process.argv[2];
  if (!slug) {
    console.error('Usage: node validate.js <slug>');
    process.exit(1);
  }
  const result = run(slug);
  console.log(`[Test Validator] Status: ${result.status}`);
  console.log(`[Test Validator] Blockers: ${result.summary.blockers}, Warnings: ${result.summary.warnings}, Info: ${result.summary.info}`);
  result.issues.forEach(i => console.log(`  [${i.severity}] ${i.category}${i.scenarioId ? ` (${i.scenarioId})` : ''}: ${i.description}`));
  process.exitCode = result.status === 'BLOCKED' ? 1 : 0;
}

module.exports = { run, checkArtifactIntegrity, detectDuplicateScenarios, checkTechnologyConsistency, checkExistingCapabilityAwareness, checkTestData, validateAgainstSchema };
