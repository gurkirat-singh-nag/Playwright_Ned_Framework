#!/usr/bin/env node

/**
 * Class Index Validator (Simplified Architecture v3.0)
 *
 * Confirms artifacts/indexes/classes/*.json still matches what generator.js
 * would produce from the current page-objects/*.js source. The index is
 * generated metadata, not the source of truth - this only detects drift.
 *
 * Usage:
 *   node .github/capabilities/validator.js          # report drift, exit 1 if stale
 *   node .github/capabilities/validator.js --fix     # regenerate indexes in place
 *   node .github/capabilities/validator.js --ci      # same as default, CI-friendly output
 */

const fs = require('fs');
const path = require('path');
const { generate } = require('./generator.js');

const WORKSPACE_ROOT = path.resolve(__dirname, '../..');
const INDEXES_DIR = path.join(WORKSPACE_ROOT, 'artifacts', 'indexes');
const CLASSES_DIR = path.join(INDEXES_DIR, 'classes');
const MANIFEST_PATH = path.join(INDEXES_DIR, '_manifest.json');

function readJsonIfExists(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return undefined; // present but invalid JSON
  }
}

function methodSignatures(classData) {
  return (classData.methods || [])
    .map(m => `${m.name}(${m.params.join(',')})`)
    .sort();
}

class IndexValidator {
  constructor({ verbose = true, fix = false, ci = false } = {}) {
    this.verbose = verbose;
    this.fix = fix;
    this.ci = ci;
  }

  log(...args) {
    if (this.verbose) console.log(...args);
  }

  validate() {
    if (this.fix) {
      this.log('[Validator] --fix: regenerating class indexes from source...');
      generate();
      this.log('[Validator] ✓ Indexes regenerated');
      return true;
    }

    const beforeManifest = readJsonIfExists(MANIFEST_PATH);
    const beforeClasses = {};
    if (fs.existsSync(CLASSES_DIR)) {
      for (const file of fs.readdirSync(CLASSES_DIR)) {
        beforeClasses[file] = readJsonIfExists(path.join(CLASSES_DIR, file));
      }
    }

    // Compute what the index *should* look like right now, without touching disk.
    const expected = generate({ summaryOnly: true });

    const issues = [];

    if (!beforeManifest) {
      issues.push('artifacts/indexes/_manifest.json is missing');
    } else if (JSON.stringify(Object.keys(beforeManifest.classes || {}).sort())
      !== JSON.stringify(Object.keys(expected.classes).sort())) {
      issues.push(
        `manifest class list is stale (committed: ${Object.keys(beforeManifest.classes || {}).sort().join(', ') || 'none'}; ` +
        `source: ${Object.keys(expected.classes).sort().join(', ')})`
      );
    }

    for (const className of Object.keys(expected.classes)) {
      const committedFile = beforeClasses[`${className}.json`];
      if (!committedFile) {
        issues.push(`classes/${className}.json is missing`);
        continue;
      }
      if (committedFile === undefined) {
        issues.push(`classes/${className}.json is not valid JSON`);
        continue;
      }

      const sourcePath = path.join(WORKSPACE_ROOT, 'page-objects', `${className}.js`);
      const { parseClassFile } = require('./generator.js');
      const freshClassData = parseClassFile(sourcePath, `page-objects/${className}.js`);
      const committedSignatures = JSON.stringify(methodSignatures(committedFile));
      const freshSignatures = JSON.stringify(methodSignatures(freshClassData));

      if (committedSignatures !== freshSignatures) {
        issues.push(`classes/${className}.json is stale: methods no longer match page-objects/${className}.js`);
      }
    }

    // Orphans: committed class files whose Page Object source no longer exists.
    for (const file of Object.keys(beforeClasses)) {
      const className = file.replace(/\.json$/, '');
      if (!expected.classes[className]) {
        issues.push(`classes/${file} is orphaned - page-objects/${className}.js no longer exists`);
      }
    }

    if (issues.length === 0) {
      this.log('[Validator] ✓ Indexes are in sync with source code');
      return true;
    }

    this.log(`[Validator] ❌ ${issues.length} issue(s) found:`);
    issues.forEach(issue => this.log(`  - ${issue}`));
    this.log('\nRun: node .github/capabilities/validator.js --fix');

    return false;
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const validator = new IndexValidator({
    verbose: true,
    fix: args.includes('--fix'),
    ci: args.includes('--ci')
  });

  const healthy = validator.validate();
  process.exit(healthy ? 0 : 1);
}

module.exports = { IndexValidator };
