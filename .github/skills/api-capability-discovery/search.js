#!/usr/bin/env node

/**
 * API Capability Search (manually maintained)
 *
 * Direct API client class/method search against *.json files under index/clients/,
 * index/api/, or index/services/ (mirroring whichever of clients//api//services/ the
 * target repository uses for its client source, kept separate from that source) - the
 * API equivalent of .github/capabilities/search-simplified.js's ClassIndexSearch,
 * reusing the same "direct index search before exploration" principle. No
 * business-capability abstraction layer, no generated manifest, no source parser (that
 * only ever worked for JavaScript - see README's former Limitations). Index files are
 * authored/updated by hand (or with AI assistance) alongside the client class they
 * describe, in any language - see api-client.instructions.md.
 *
 * CLI usage:
 *   node .github/skills/api-capability-discovery/search.js "get customer by id"
 *   node .github/skills/api-capability-discovery/search.js --class CustomerApiClient
 *   node .github/skills/api-capability-discovery/search.js --summary
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');
const CANDIDATE_DIRS = ['index/clients', 'index/api', 'index/services'];

// Action-verb families: mismatched families lower confidence even with strong token
// overlap elsewhere, so e.g. getCustomer() doesn't get credited for a "search"/"find"
// requirement just because "customer" overlaps - see README's No False Positives rule.
const VERB_FAMILIES = {
  get: ['get', 'retrieve', 'fetch'],
  search: ['search', 'find', 'query', 'list'],
  create: ['create', 'add', 'register'],
  update: ['update', 'edit', 'modify', 'patch'],
  delete: ['delete', 'remove', 'cancel']
};

function tokenize(text) {
  // Split camelCase BEFORE lowercasing - [a-z0-9][A-Z] never matches on already-lowercased
  // text, which would silently collapse e.g. "CustomerApiClient" into one blob token.
  return text.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase().split(/[^a-z0-9]+/i).filter(Boolean);
}

function scoreOverlap(queryTokens, candidateTokens) {
  if (queryTokens.length === 0 || candidateTokens.length === 0) return 0;
  const candidateSet = new Set(candidateTokens);
  const matched = queryTokens.filter(t => candidateSet.has(t)).length;
  return Math.round((matched / queryTokens.length) * 100);
}

function verbFamilyOf(tokens) {
  for (const [family, verbs] of Object.entries(VERB_FAMILIES)) {
    if (tokens.some(t => verbs.includes(t))) return family;
  }
  return null;
}

class ApiIndexSearch {
  constructor({ verbose = false } = {}) {
    this.verbose = verbose;
    this.classes = {};

    for (const dirName of CANDIDATE_DIRS) {
      const dirPath = path.join(WORKSPACE_ROOT, dirName);
      if (!fs.existsSync(dirPath)) continue;

      const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(dirPath, file), 'utf-8'));
          if (data.className) this.classes[data.className] = data;
        } catch (err) {
          if (this.verbose) console.warn(`[API Search] ⚠ Skipping unreadable index file: ${dirName}/${file} (${err.message})`);
        }
      }
    }

    if (this.verbose) console.log(`[API Search] Loaded ${Object.keys(this.classes).length} API class indexes from index/{clients,api,services}/*.json`);
  }

  getClass(className) {
    return this.classes[className] || null;
  }

  searchClasses(query) {
    const queryTokens = tokenize(query);
    const results = [];
    for (const [className, classData] of Object.entries(this.classes)) {
      const score = scoreOverlap(queryTokens, tokenize(className));
      if (score > 0) results.push({ className, score, file: classData.file, methods: classData.methods.map(m => m.name) });
    }
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Scores method name/description overlap, penalized when the query's action verb
   * and the method's action verb belong to different families (see No False Positives).
   */
  searchMethods(query) {
    const queryTokens = tokenize(query);
    const queryVerb = verbFamilyOf(queryTokens);
    const results = [];

    for (const [className, classData] of Object.entries(this.classes)) {
      const classNameTokens = tokenize(className);
      for (const method of classData.methods) {
        const nameTokens = tokenize(method.name);
        const descriptionTokens = tokenize(method.description || '');
        const methodVerb = verbFamilyOf(nameTokens);

        const primaryScore = scoreOverlap(queryTokens, [...nameTokens, ...descriptionTokens]);
        const classScore = scoreOverlap(queryTokens, classNameTokens);
        let score = Math.round(primaryScore * 0.8 + classScore * 0.2);

        if (queryVerb && methodVerb) {
          if (queryVerb === methodVerb) {
            // Same operation family (e.g. "retrieve" and "get") is a strong positive
            // signal even when the literal wording differs - reward it explicitly
            // rather than relying on token overlap alone to reach FULL_REUSE confidence.
            score = Math.min(100, score + 30);
          } else {
            score = Math.round(score * 0.3); // different operation family - strong penalty
          }
        }

        if (score > 0) {
          results.push({
            className, method: method.name, parameters: method.params, description: method.description,
            httpMethod: method.httpMethod, endpoint: method.endpoint, score
          });
        }
      }
    }
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * requiredOperations: array of { description, httpMethod?, endpoint? } - one per
   * distinct operation a scenario needs (not raw scenario steps verbatim; the caller
   * distills "what API operation is this step actually asking for").
   *
   * Returns FULL_REUSE (100% of operations matched with high confidence) / PARTIAL_REUSE
   * (some matched) / NO_REUSE (none matched), mirroring the UI reuse decision's three-way
   * split, with a higher confidence bar than UI search (minConfidence 75 vs 60) because a
   * wrong API reuse match is costlier than a wrong UI locator guess - see No False Positives.
   */
  analyzeReuseCoverage(requiredOperations, { minConfidence = 75 } = {}) {
    const existingImplementation = [];
    const missing = [];

    for (const op of requiredOperations) {
      const matches = this.searchMethods(op.description);
      let best = matches[0];

      // If the requirement states an explicit HTTP method/endpoint, require it to match
      // too - do not credit a method-name-only match against stated concrete evidence.
      if (best && (op.httpMethod || op.endpoint)) {
        const consistent = matches.find(m =>
          (!op.httpMethod || m.httpMethod === op.httpMethod) &&
          (!op.endpoint || (m.endpoint && m.endpoint.includes(op.endpoint)))
        );
        best = consistent || null;
      }

      if (best && best.score >= minConfidence) {
        existingImplementation.push({ class: best.className, method: best.method, confidence: best.score, operation: op.description });
      } else {
        missing.push(op.description);
      }
    }

    const total = requiredOperations.length;
    const coverage = total === 0 ? 0 : Math.round((existingImplementation.length / total) * 100);

    let decision;
    if (coverage === 100) decision = 'FULL_REUSE';
    else if (coverage > 0) decision = 'PARTIAL_REUSE';
    else decision = 'NO_REUSE';

    return { decision, coverage, existingImplementation, missing };
  }

  getSummary() {
    const classNames = Object.keys(this.classes);
    return {
      classCount: classNames.length,
      methodCount: classNames.reduce((sum, c) => sum + this.classes[c].methods.length, 0),
      classes: classNames
    };
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const searcher = new ApiIndexSearch({ verbose: true });

  if (args.includes('--summary')) {
    console.log(JSON.stringify(searcher.getSummary(), null, 2));
  } else if (args.includes('--class')) {
    const className = args[args.indexOf('--class') + 1];
    const classData = searcher.getClass(className);
    console.log(classData ? JSON.stringify(classData, null, 2) : `Class not found: ${className}`);
  } else {
    const query = args.filter(a => !a.startsWith('--')).join(' ');
    if (!query) {
      console.log('Usage: node search.js "<query>" | --class <name> | --summary');
      process.exit(1);
    }
    console.log(JSON.stringify(searcher.searchMethods(query), null, 2));
  }
}

module.exports = { ApiIndexSearch };
