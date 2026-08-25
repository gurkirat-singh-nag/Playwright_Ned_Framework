#!/usr/bin/env node

/**
 * API Class Index Generator
 *
 * Derives artifacts/indexes/api/<className>.json and artifacts/indexes/api/_manifest.json
 * directly from actual API client/service source files in this repository - the same
 * "index is generated metadata, never the source of truth" contract as
 * .github/capabilities/generator.js (the UI Page Object index), applied to API clients
 * instead. Re-running this script always reflects current source, including removing
 * entries for methods/classes that no longer exist.
 *
 * This repository currently has NO API automation (no api/, clients/, or services/
 * directories, no RestAssured/axios/supertest dependency, no *ApiClient/*Client source
 * files - verified before writing this script). Running this generator today correctly
 * produces an empty index. It is written to work the moment a developer adds a real
 * API client, not to pretend one exists now - see api-capability-discovery/README.md.
 *
 * Usage:
 *   node .github/skills/api-capability-discovery/generator.js
 *   node .github/skills/api-capability-discovery/generator.js --summary
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');
const INDEXES_DIR = path.join(WORKSPACE_ROOT, 'artifacts', 'indexes');
const API_INDEX_DIR = path.join(INDEXES_DIR, 'api');
const MANIFEST_PATH = path.join(API_INDEX_DIR, '_manifest.json');

// Same search strategy already documented (but never implemented) in
// .github/hooks/04_duplicate-detection.hook.md's "api-client" target type -
// reused here rather than inventing a different discovery convention.
const SEARCH_DIRS = ['api', 'clients', 'services'];
const FILE_SUFFIX_PATTERN = /(ApiClient|Client|Api)\.js$/;

const CONTROL_KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'constructor']);
const HTTP_METHOD_PATTERN = /\.(get|post|put|patch|delete)\s*\(\s*(['"`])([^'"`]*)\2/i;
const AUTH_HINT_PATTERN = /(Authorization|Bearer|apiKey|api_key|x-api-key|Basic\s+auth)/i;

function toDescription(name) {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

function findApiSourceFiles() {
  const files = [];
  for (const dir of SEARCH_DIRS) {
    const dirPath = path.join(WORKSPACE_ROOT, dir);
    if (!fs.existsSync(dirPath)) continue;
    for (const f of fs.readdirSync(dirPath)) {
      if (f.endsWith('.js')) files.push({ dir, file: f });
    }
  }
  // Also catch root-level *ApiClient.js / *Client.js files outside a dedicated directory.
  for (const f of fs.readdirSync(WORKSPACE_ROOT)) {
    if (FILE_SUFFIX_PATTERN.test(f) && fs.statSync(path.join(WORKSPACE_ROOT, f)).isFile()) {
      files.push({ dir: '.', file: f });
    }
  }
  return files;
}

function extractJsDocAbove(source, index) {
  const trimmed = source.slice(0, index).replace(/\s+$/, '');
  if (!trimmed.endsWith('*/')) return null;
  const closingIdx = trimmed.length - 2;
  const startIdx = trimmed.lastIndexOf('/**', closingIdx);
  if (startIdx === -1) return null;
  const content = trimmed.slice(startIdx + 3, closingIdx);
  const lines = content.split('\n').map(l => l.replace(/^\s*\*\s?/, '').trim()).filter(l => l.length > 0 && !l.startsWith('@'));
  return lines.length > 0 ? lines[0] : null;
}

/** Same brace-depth method-parsing technique as .github/capabilities/generator.js, reused verbatim rather than reimplemented differently. */
function parseApiClientFile(filePath, relativeFile) {
  const source = fs.readFileSync(filePath, 'utf-8');
  const classMatch = source.match(/class\s+(\w+)/);
  if (!classMatch) return null;
  const className = classMatch[1];

  const classBraceStart = source.indexOf('{', classMatch.index);
  if (classBraceStart === -1) return null;

  const identifierChar = /[A-Za-z0-9_$]/;
  const methods = [];
  let depth = 0;
  let i = classBraceStart;

  for (; i < source.length; i++) {
    const ch = source[i];

    if (depth === 1 && ch !== '{' && ch !== '}') {
      const precedingChar = i > 0 ? source[i - 1] : '';
      if (!identifierChar.test(precedingChar)) {
        const memberMatch = source.slice(i).match(/^\s*(async\s+)?([A-Za-z_$][\w$]*)\s*\(([^)]*)\)\s*\{/);
        if (memberMatch) {
          const [full, asyncKeyword, name, paramsRaw] = memberMatch;
          if (!CONTROL_KEYWORDS.has(name) && name !== 'constructor') {
            const bodyStart = i + full.length;
            let bodyDepth = 1;
            let j = bodyStart;
            for (; j < source.length && bodyDepth > 0; j++) {
              if (source[j] === '{') bodyDepth++;
              else if (source[j] === '}') bodyDepth--;
            }
            const body = source.slice(bodyStart, j);

            const params = paramsRaw.split(',').map(p => p.trim().split('=')[0].trim()).filter(Boolean);
            const httpMatch = body.match(HTTP_METHOD_PATTERN);
            const description = extractJsDocAbove(source, i) || toDescription(name);

            methods.push({
              name,
              params,
              async: Boolean(asyncKeyword),
              description,
              httpMethod: httpMatch ? httpMatch[1].toUpperCase() : null,
              endpoint: httpMatch ? httpMatch[3] : null,
              authenticationHint: AUTH_HINT_PATTERN.test(body) ? AUTH_HINT_PATTERN.exec(body)[0] : null
            });
          }
          i = i + full.length - 2;
          continue;
        }
      }
    }

    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) break; }
  }

  methods.sort((a, b) => a.name.localeCompare(b.name));

  return {
    className,
    file: relativeFile,
    type: 'ApiClient',
    methods,
    lastUpdated: new Date().toISOString()
  };
}

function generate({ summaryOnly = false } = {}) {
  const sourceFiles = findApiSourceFiles();
  const manifestClasses = {};
  let totalMethods = 0;

  if (!summaryOnly) {
    fs.mkdirSync(API_INDEX_DIR, { recursive: true });
    if (fs.existsSync(API_INDEX_DIR)) {
      for (const existing of fs.readdirSync(API_INDEX_DIR)) {
        if (existing !== '_manifest.json') fs.unlinkSync(path.join(API_INDEX_DIR, existing));
      }
    }
  }

  for (const { dir, file } of sourceFiles) {
    const fullPath = path.join(WORKSPACE_ROOT, dir, file);
    const relativeFile = dir === '.' ? file : `${dir}/${file}`;
    const classInfo = parseApiClientFile(fullPath, relativeFile);
    if (!classInfo) {
      console.warn(`[API Index Generator] ⚠ Skipped ${relativeFile}: no class declaration found`);
      continue;
    }

    totalMethods += classInfo.methods.length;
    manifestClasses[classInfo.className] = {
      file: `${classInfo.className}.json`,
      methods: classInfo.methods.length,
      type: 'ApiClient'
    };

    if (!summaryOnly) {
      fs.writeFileSync(path.join(API_INDEX_DIR, `${classInfo.className}.json`), JSON.stringify(classInfo, null, 2) + '\n');
    }
    console.log(`[API Index Generator] ✓ ${classInfo.className}: ${classInfo.methods.length} methods`);
  }

  const manifest = {
    version: '1.0.0',
    mode: 'api-classes-only',
    description: 'Lightweight API client index - one file per actual API client class, no business-capability abstraction layer',
    generatedAt: new Date().toISOString(),
    classes: manifestClasses,
    statistics: {
      totalClasses: Object.keys(manifestClasses).length,
      totalMethods
    },
    note: Object.keys(manifestClasses).length === 0
      ? 'No API automation implementation found in this repository at generation time. This is an honest empty index, not a placeholder - see api-capability-discovery/README.md.'
      : undefined
  };

  if (!summaryOnly) {
    fs.mkdirSync(INDEXES_DIR, { recursive: true });
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
  }

  console.log(`\n[API Index Generator] ${summaryOnly ? 'Would generate' : 'Generated'} ${manifest.statistics.totalClasses} API class indexes, ${totalMethods} methods total`);
  return manifest;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  generate({ summaryOnly: args.includes('--summary') });
}

module.exports = { generate, parseApiClientFile, findApiSourceFiles };
