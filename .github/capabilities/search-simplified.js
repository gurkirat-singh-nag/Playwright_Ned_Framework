#!/usr/bin/env node

/**
 * Class Index Search (Simplified Architecture v3.0)
 *
 * Direct Page Object class/method search against artifacts/indexes/classes/ -
 * no business-capability abstraction layer. This is the reuse knowledge base
 * consulted before launching Playwright MCP browser exploration.
 *
 * CLI usage:
 *   node .github/capabilities/search-simplified.js "login"
 *   node .github/capabilities/search-simplified.js --class loginPage
 *   node .github/capabilities/search-simplified.js --summary
 */

const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = path.resolve(__dirname, '../..');
const INDEXES_DIR = path.join(WORKSPACE_ROOT, 'artifacts', 'indexes');
const MANIFEST_PATH = path.join(INDEXES_DIR, '_manifest.json');

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^a-z0-9]+/i)
    .map(t => t.toLowerCase())
    .filter(Boolean);
}

function scoreOverlap(queryTokens, candidateTokens) {
  if (queryTokens.length === 0 || candidateTokens.length === 0) return 0;
  const candidateSet = new Set(candidateTokens);
  const matched = queryTokens.filter(t => candidateSet.has(t)).length;
  return Math.round((matched / queryTokens.length) * 100);
}

class ClassIndexSearch {
  constructor({ verbose = false } = {}) {
    this.verbose = verbose;

    if (!fs.existsSync(MANIFEST_PATH)) {
      throw new Error(`Class index manifest not found at ${MANIFEST_PATH}. Run: node .github/capabilities/generator.js`);
    }

    this.manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf-8'));
    this.classes = {};

    for (const className of Object.keys(this.manifest.classes || {})) {
      const classFile = path.join(INDEXES_DIR, this.manifest.classes[className].file);
      if (fs.existsSync(classFile)) {
        this.classes[className] = JSON.parse(fs.readFileSync(classFile, 'utf-8'));
      } else if (this.verbose) {
        console.warn(`[Search] ⚠ Manifest references missing file: ${classFile}`);
      }
    }

    if (this.verbose) {
      console.log(`[Search] Loaded ${Object.keys(this.classes).length} class indexes`);
    }
  }

  getClass(className) {
    return this.classes[className] || null;
  }

  /** Search Page Objects by keyword (class name + locator names). */
  searchClasses(query) {
    const queryTokens = tokenize(query);
    const results = [];

    for (const [className, classData] of Object.entries(this.classes)) {
      const candidateTokens = [
        ...tokenize(className),
        ...classData.locators.flatMap(tokenize)
      ];
      const score = scoreOverlap(queryTokens, candidateTokens);
      if (score > 0) {
        results.push({
          className,
          score,
          file: classData.file,
          methods: classData.methods.map(m => m.name)
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /** Search methods across all classes by keyword (method name + description + class name). */
  searchMethods(query) {
    const queryTokens = tokenize(query);
    const results = [];

    for (const [className, classData] of Object.entries(this.classes)) {
      const classNameTokens = tokenize(className);

      for (const method of classData.methods) {
        const nameTokens = tokenize(method.name);
        const descriptionTokens = tokenize(method.description || '');

        // Method name/description carry the primary signal; the owning class
        // name is a secondary signal that disambiguates generic method names
        // (e.g. "goto", "isXDisplayed") that exist on several Page Objects.
        const primaryScore = scoreOverlap(queryTokens, [...nameTokens, ...descriptionTokens]);
        const classScore = scoreOverlap(queryTokens, classNameTokens);
        const score = Math.round(primaryScore * 0.8 + classScore * 0.2);

        if (score > 0) {
          results.push({
            className,
            method: method.name,
            parameters: method.params,
            description: method.description,
            score
          });
        }
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Given a list of required action descriptions (e.g. from a Jira story's
   * acceptance criteria), find the best matching existing method for each
   * action and compute overall reuse coverage.
   */
  analyzeReuseCoverage(requiredActions, { minConfidence = 60 } = {}) {
    const foundMethods = [];
    const missingActions = [];

    for (const action of requiredActions) {
      const matches = this.searchMethods(action);
      const best = matches[0];

      if (best && best.score >= minConfidence) {
        foundMethods.push({
          action,
          className: best.className,
          method: best.method,
          parameters: best.parameters,
          confidence: best.score
        });
      } else {
        missingActions.push(action);
      }
    }

    const total = requiredActions.length;
    const coveragePercentage = total === 0 ? 0 : Math.round((foundMethods.length / total) * 100);

    let recommendation;
    let skipExploration;
    let explorationScope;

    if (coveragePercentage === 100) {
      recommendation = 'REUSE';
      skipExploration = true;
      explorationScope = 'none';
    } else if (coveragePercentage >= 50) {
      recommendation = 'PARTIAL';
      skipExploration = false;
      explorationScope = 'selective';
    } else {
      recommendation = 'EXPLORE';
      skipExploration = false;
      explorationScope = 'full';
    }

    return {
      coveragePercentage,
      recommendation,
      skipExploration,
      explorationScope,
      foundMethods,
      missingActions,
      reusableClasses: [...new Set(foundMethods.map(m => m.className))]
    };
  }

  /** Verify that methods reported by the index still exist in the actual source file. */
  verifyMethodsInSource(className, methodNames) {
    const classData = this.classes[className];
    if (!classData) {
      return { allFound: false, missing: methodNames };
    }

    const sourcePath = path.join(WORKSPACE_ROOT, classData.file);
    if (!fs.existsSync(sourcePath)) {
      return { allFound: false, missing: methodNames };
    }

    const source = fs.readFileSync(sourcePath, 'utf-8');
    const missing = methodNames.filter(name => {
      const pattern = new RegExp(`(async\\s+)?\\b${name}\\s*\\(`);
      return !pattern.test(source);
    });

    return { allFound: missing.length === 0, missing };
  }

  getSummary() {
    return {
      version: this.manifest.version,
      generatedAt: this.manifest.generatedAt,
      statistics: this.manifest.statistics,
      classes: Object.keys(this.classes)
    };
  }
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const searcher = new ClassIndexSearch({ verbose: true });

  if (args.includes('--summary')) {
    console.log(JSON.stringify(searcher.getSummary(), null, 2));
  } else if (args.includes('--class')) {
    const className = args[args.indexOf('--class') + 1];
    const classData = searcher.getClass(className);
    console.log(classData ? JSON.stringify(classData, null, 2) : `Class not found: ${className}`);
  } else {
    const query = args.filter(a => !a.startsWith('--')).join(' ');
    if (!query) {
      console.log('Usage: node search-simplified.js "<query>" | --class <name> | --summary');
      process.exit(1);
    }
    console.log(`\nClasses matching "${query}":`);
    console.log(JSON.stringify(searcher.searchClasses(query), null, 2));
    console.log(`\nMethods matching "${query}":`);
    console.log(JSON.stringify(searcher.searchMethods(query), null, 2));
  }
}

module.exports = { ClassIndexSearch };
