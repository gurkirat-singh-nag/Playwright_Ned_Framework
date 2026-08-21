#!/usr/bin/env node

/**
 * Class Index Generator (Simplified Architecture v3.0)
 *
 * Derives artifacts/indexes/classes/<className>.json and artifacts/indexes/_manifest.json
 * directly from page-objects/*.js. The index is generated metadata, never the source of
 * truth - re-running this script always reflects the current state of page-objects/,
 * including removing entries for methods/classes that no longer exist.
 *
 * Usage:
 *   node .github/capabilities/generator.js              # regenerate all class indexes
 *   node .github/capabilities/generator.js --summary     # print stats only, no write
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = path.resolve(__dirname, '../..');
const PAGE_OBJECTS_DIR = path.join(WORKSPACE_ROOT, 'page-objects');
const INDEXES_DIR = path.join(WORKSPACE_ROOT, 'artifacts', 'indexes');
const CLASSES_DIR = path.join(INDEXES_DIR, 'classes');
const MANIFEST_PATH = path.join(INDEXES_DIR, '_manifest.json');

const CONTROL_KEYWORDS = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'function', 'constructor'
]);

function toDescription(name) {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

function extractJsDocAbove(source, index) {
  const trimmed = source.slice(0, index).replace(/\s+$/, '');
  if (!trimmed.endsWith('*/')) return null;

  const closingIdx = trimmed.length - 2;
  const startIdx = trimmed.lastIndexOf('/**', closingIdx);
  if (startIdx === -1) return null;

  const content = trimmed.slice(startIdx + 3, closingIdx);
  const lines = content
    .split('\n')
    .map(l => l.replace(/^\s*\*\s?/, '').trim())
    .filter(l => l.length > 0 && !l.startsWith('@'));
  return lines.length > 0 ? lines[0] : null;
}

/**
 * Parses one Page Object source file using brace-depth tracking so that
 * control-flow blocks (if/for/while) nested inside methods are never
 * mistaken for method declarations - only identifiers immediately inside
 * the class body (depth === 1) count as methods.
 */
function parseClassFile(filePath, relativeFile) {
  const source = fs.readFileSync(filePath, 'utf-8');

  const classMatch = source.match(/class\s+(\w+)/);
  if (!classMatch) return null;
  const className = classMatch[1];

  const classBraceStart = source.indexOf('{', classMatch.index);
  if (classBraceStart === -1) return null;

  const methods = [];
  const locatorSet = new Set();

  const identifierChar = /[A-Za-z0-9_$]/;
  let depth = 0;
  let i = classBraceStart;

  for (; i < source.length; i++) {
    const ch = source[i];

    if (depth === 1 && ch !== '{' && ch !== '}') {
      const precedingChar = i > 0 ? source[i - 1] : '';
      const atTokenBoundary = !identifierChar.test(precedingChar);

      if (atTokenBoundary) {
        const memberMatch = source
          .slice(i)
          .match(/^\s*(async\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/);

        if (memberMatch) {
          const [full, asyncKeyword, name, paramsRaw] = memberMatch;
          if (!CONTROL_KEYWORDS.has(name)) {
            const params = paramsRaw
              .split(',')
              .map(p => p.trim().split('=')[0].trim())
              .filter(Boolean);

            if (name !== 'constructor') {
              const description = extractJsDocAbove(source, i) || toDescription(name);
              methods.push({
                name,
                params,
                async: Boolean(asyncKeyword),
                description
              });
            }
          }

          // Jump straight to the method's opening brace so the header itself
          // (and substrings of its identifier) are never re-scanned.
          i = i + full.length - 2;
          continue;
        }
      }
    }

    if (ch === '{') {
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) break; // end of class
    }
  }

  const constructorMatch = source.match(/constructor\s*\([^)]*\)\s*\{/);
  if (constructorMatch) {
    const start = constructorMatch.index + constructorMatch[0].length;
    let cDepth = 1;
    let j = start;
    for (; j < source.length && cDepth > 0; j++) {
      if (source[j] === '{') cDepth++;
      else if (source[j] === '}') cDepth--;
    }
    const constructorBody = source.slice(start, j);
    const locatorRegex = /this\.([A-Za-z_$][\w$]*)\s*=\s*(?!page[;\s])/g;
    let m;
    while ((m = locatorRegex.exec(constructorBody)) !== null) {
      if (m[1] !== 'page') locatorSet.add(m[1]);
    }
  }

  methods.sort((a, b) => a.name.localeCompare(b.name));

  return {
    className,
    file: relativeFile,
    type: 'PageObject',
    methods,
    locators: Array.from(locatorSet).sort(),
    lastUpdated: new Date().toISOString()
  };
}

function generate({ summaryOnly = false } = {}) {
  if (!fs.existsSync(PAGE_OBJECTS_DIR)) {
    console.error(`[Generator] page-objects/ not found at ${PAGE_OBJECTS_DIR}`);
    process.exitCode = 1;
    return;
  }

  const files = fs
    .readdirSync(PAGE_OBJECTS_DIR)
    .filter(f => f.endsWith('.js'))
    .sort();

  const manifestClasses = {};
  let totalMethods = 0;
  let totalLocators = 0;

  if (!summaryOnly) {
    fs.mkdirSync(CLASSES_DIR, { recursive: true });
    // Remove stale per-class files so deleted Page Objects don't linger in the index.
    for (const existing of fs.readdirSync(CLASSES_DIR)) {
      fs.unlinkSync(path.join(CLASSES_DIR, existing));
    }
  }

  for (const file of files) {
    const fullPath = path.join(PAGE_OBJECTS_DIR, file);
    const relativeFile = `page-objects/${file}`;
    const classInfo = parseClassFile(fullPath, relativeFile);
    if (!classInfo) {
      console.warn(`[Generator] ⚠ Skipped ${file}: no class declaration found`);
      continue;
    }

    totalMethods += classInfo.methods.length;
    totalLocators += classInfo.locators.length;

    manifestClasses[classInfo.className] = {
      file: `classes/${classInfo.className}.json`,
      methods: classInfo.methods.length,
      type: 'PageObject'
    };

    if (!summaryOnly) {
      fs.writeFileSync(
        path.join(CLASSES_DIR, `${classInfo.className}.json`),
        JSON.stringify(classInfo, null, 2) + '\n'
      );
    }

    console.log(`[Generator] ✓ ${classInfo.className}: ${classInfo.methods.length} methods, ${classInfo.locators.length} locators`);
  }

  const manifest = {
    version: '3.0.0',
    mode: 'classes-only',
    description: 'Simplified class index - no capability abstraction layer',
    generatedAt: new Date().toISOString(),
    classes: manifestClasses,
    statistics: {
      totalClasses: Object.keys(manifestClasses).length,
      totalMethods,
      totalLocators
    },
    indexingStrategy: 'Direct class search - reuse existing Page Objects and methods before browser exploration'
  };

  if (!summaryOnly) {
    fs.mkdirSync(INDEXES_DIR, { recursive: true });
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  }

  console.log(`\n[Generator] ${summaryOnly ? 'Would generate' : 'Generated'} ${manifest.statistics.totalClasses} class indexes, ${totalMethods} methods total`);
  return manifest;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  generate({ summaryOnly: args.includes('--summary') });
}

module.exports = { generate, parseClassFile };
