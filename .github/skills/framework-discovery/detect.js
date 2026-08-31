#!/usr/bin/env node

/**
 * Framework Discovery
 *
 * Code/repository discovery only - inspects package.json, config files, and
 * directory structure to build artifacts/indexes/framework-profile.json.
 *
 * Does NOT launch a browser, MCP server, or call any live API. That is the
 * explicit responsibility boundary of this script; see the Skill README.
 *
 * Usage:
 *   node .github/skills/framework-discovery/detect.js            # regenerate if stale/missing
 *   node .github/skills/framework-discovery/detect.js --force     # always regenerate
 *   node .github/skills/framework-discovery/detect.js --check     # exit 1 if stale/missing, no write
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');
const PROFILE_PATH = path.join(WORKSPACE_ROOT, 'artifacts', 'indexes', 'framework-profile.json');

const UNKNOWN = 'unknown';

function exists(relPath) {
  return fs.existsSync(path.join(WORKSPACE_ROOT, relPath));
}

function readJson(relPath) {
  try {
    return JSON.parse(fs.readFileSync(path.join(WORKSPACE_ROOT, relPath), 'utf-8'));
  } catch {
    return null;
  }
}

function listDir(relPath) {
  try {
    return fs.readdirSync(path.join(WORKSPACE_ROOT, relPath)).sort();
  } catch {
    return [];
  }
}

function readTextIfExists(relPath) {
  try {
    return fs.readFileSync(path.join(WORKSPACE_ROOT, relPath), 'utf-8');
  } catch {
    return null;
  }
}

/**
 * The set of repository facts that, if any of them change, invalidate the
 * cached profile. Kept deliberately narrow (manifests + top-level listings
 * of the directories this discovery cares about) rather than hashing the
 * whole tree, so unrelated file edits (e.g. inside a single test spec)
 * don't force a re-detection.
 */
function computeSignature() {
  const inputs = {
    packageJson: readTextIfExists('package.json'),
    pomXml: readTextIfExists('pom.xml'),
    buildGradle: readTextIfExists('build.gradle'),
    requirementsTxt: readTextIfExists('requirements.txt'),
    pyprojectToml: readTextIfExists('pyproject.toml'),
    playwrightConfig: readTextIfExists('playwright.config.js') || readTextIfExists('playwright.config.ts'),
    mcpConfig: readTextIfExists('.vscode/mcp.json'),
    pageObjects: listDir('page-objects'),
    tests: listDir('tests'),
    utils: listDir('utils'),
    githubAgents: listDir('.github/agents'),
    githubSkills: listDir('.github/skills'),
    githubHooks: listDir('.github/hooks'),
    githubWorkflows: listDir('.github/workflows')
  };
  return crypto.createHash('sha256').update(JSON.stringify(inputs)).digest('hex');
}

function detectLanguage(pkg) {
  if (exists('pom.xml') || exists('build.gradle') || exists('build.gradle.kts')) return 'Java';
  if (exists('requirements.txt') || exists('pyproject.toml')) return 'Python';
  if (pkg) {
    if (exists('tsconfig.json') || (pkg.devDependencies && pkg.devDependencies.typescript) || (pkg.dependencies && pkg.dependencies.typescript)) {
      return 'TypeScript';
    }
    return 'JavaScript';
  }
  return UNKNOWN;
}

function detectUiFramework(pkg) {
  const deps = { ...(pkg && pkg.dependencies), ...(pkg && pkg.devDependencies) };
  if (deps['@playwright/test'] || deps['playwright'] || exists('playwright.config.js') || exists('playwright.config.ts')) return 'Playwright';
  if (deps['cypress'] || exists('cypress.config.js') || exists('cypress.config.ts')) return 'Cypress';
  if (deps['selenium-webdriver'] || deps['@wdio/cli']) return 'Selenium';
  if (deps['appium']) return 'Appium';
  return 'none';
}

function detectApiFramework(pkg) {
  const deps = { ...(pkg && pkg.dependencies), ...(pkg && pkg.devDependencies) };
  if (deps['supertest']) return 'Supertest';
  if (deps['axios']) return 'Axios (unstructured)';
  if (exists('pom.xml') && readTextIfExists('pom.xml') && readTextIfExists('pom.xml').includes('rest-assured')) return 'RestAssured';
  return UNKNOWN;
}

function detectTestRunner(pkg) {
  const deps = { ...(pkg && pkg.dependencies), ...(pkg && pkg.devDependencies) };
  if (deps['@playwright/test']) return 'Playwright Test';
  if (deps['jest']) return 'Jest';
  if (deps['mocha']) return 'Mocha';
  if (exists('pom.xml')) {
    const pom = readTextIfExists('pom.xml') || '';
    if (pom.includes('testng')) return 'TestNG';
    if (pom.includes('junit')) return 'JUnit';
  }
  return UNKNOWN;
}

function detectUiArchitecture() {
  const pageObjectFiles = listDir('page-objects').filter(f => f.endsWith('.js'));
  if (pageObjectFiles.length > 0) return 'Page Object Model';
  return UNKNOWN;
}

function detectApiArchitecture() {
  if (exists('api') || exists('clients') || exists('services')) return 'API client pattern';
  return UNKNOWN;
}

function detectPackageManager() {
  if (exists('pom.xml')) return 'Maven';
  if (exists('build.gradle') || exists('build.gradle.kts')) return 'Gradle';
  if (exists('requirements.txt') || exists('pyproject.toml')) return 'pip';
  if (exists('pnpm-lock.yaml')) return 'pnpm';
  if (exists('yarn.lock')) return 'yarn';
  if (exists('package-lock.json')) return 'npm';
  return UNKNOWN;
}

function detectReporting(pkg) {
  const deps = { ...(pkg && pkg.dependencies), ...(pkg && pkg.devDependencies) };
  const reporting = [];
  if (deps['allure-playwright'] || deps['allure-commandline']) reporting.push('Allure');

  const configText = readTextIfExists('playwright.config.js') || readTextIfExists('playwright.config.ts');
  if (configText) {
    if (/reporter:\s*\[[^\]]*\['html'\]/.test(configText) || /reporter:.*html/.test(configText)) {
      reporting.push('Playwright HTML');
    }
    if (/reporter:.*\['line'\]/.test(configText) || /reporter:.*\bline\b/.test(configText)) {
      reporting.push('line');
    }
  }
  return [...new Set(reporting)];
}

function detectCi() {
  const ci = [];
  if (listDir('.github/workflows').some(f => f.endsWith('.yml') || f.endsWith('.yaml'))) ci.push('GitHub Actions');
  if (exists('Jenkinsfile')) ci.push('Jenkins');
  if (exists('azure-pipelines.yml')) ci.push('Azure DevOps');
  return ci;
}

function detectMcp() {
  const mcpConfig = readJson('.vscode/mcp.json');
  if (!mcpConfig || !mcpConfig.servers) return [];
  return Object.keys(mcpConfig.servers).map(name => {
    if (name === 'playwright') return 'Playwright MCP';
    if (name === 'atlassian') return 'Atlassian MCP';
    return name;
  });
}

function detectDirectories() {
  return {
    pageObjects: exists('page-objects') ? 'page-objects/' : UNKNOWN,
    tests: exists('tests') ? 'tests/' : UNKNOWN,
    apiClients: (exists('api') && 'api/') || (exists('clients') && 'clients/') || UNKNOWN,
    utilities: exists('utils') ? 'utils/' : UNKNOWN,
    testData: exists('utils/testDataUtils.json') ? 'utils/testDataUtils.json' : UNKNOWN,
    fixtures: exists('fixtures') ? 'fixtures/' : UNKNOWN,
    configuration: exists('playwright.config.js') ? 'playwright.config.js' : (exists('playwright.config.ts') ? 'playwright.config.ts' : UNKNOWN),
    hooks: exists('.github/hooks') ? '.github/hooks/' : UNKNOWN,
    skills: exists('.github/skills') ? '.github/skills/' : UNKNOWN,
    agents: exists('.github/agents') ? '.github/agents/' : UNKNOWN,
    workflows: exists('.github/workflows') ? '.github/workflows/' : UNKNOWN,
    capabilityIndex: 'index/page-objects/*.json'
  };
}

function buildProfile() {
  const pkg = readJson('package.json');

  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    signature: computeSignature(),
    language: detectLanguage(pkg),
    uiFramework: detectUiFramework(pkg),
    apiFramework: detectApiFramework(pkg),
    testRunner: detectTestRunner(pkg),
    architecture: {
      ui: detectUiArchitecture(),
      api: detectApiArchitecture()
    },
    packageManager: detectPackageManager(),
    reporting: detectReporting(pkg),
    ci: detectCi(),
    mcp: detectMcp(),
    directories: detectDirectories()
  };
}

function isStale() {
  const existing = readJson(path.relative(WORKSPACE_ROOT, PROFILE_PATH));
  if (!existing) return true;
  return existing.signature !== computeSignature();
}

function run({ force = false, checkOnly = false } = {}) {
  const stale = force || isStale();

  if (checkOnly) {
    if (stale) {
      console.log('[Framework Discovery] Profile is missing or stale.');
      process.exitCode = 1;
    } else {
      console.log('[Framework Discovery] ✓ Profile is up to date.');
    }
    return;
  }

  if (!stale) {
    console.log('[Framework Discovery] ✓ Existing framework-profile.json is current - reusing it.');
    return readJson(path.relative(WORKSPACE_ROOT, PROFILE_PATH));
  }

  const profile = buildProfile();
  fs.mkdirSync(path.dirname(PROFILE_PATH), { recursive: true });
  fs.writeFileSync(PROFILE_PATH, JSON.stringify(profile, null, 2) + '\n');

  console.log('[Framework Discovery] ✓ framework-profile.json generated');
  console.log(`[Framework Discovery]   language: ${profile.language}`);
  console.log(`[Framework Discovery]   uiFramework: ${profile.uiFramework}`);
  console.log(`[Framework Discovery]   testRunner: ${profile.testRunner}`);
  console.log(`[Framework Discovery]   architecture.ui: ${profile.architecture.ui}`);

  return profile;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  run({ force: args.includes('--force'), checkOnly: args.includes('--check') });
}

module.exports = { run, buildProfile, computeSignature, isStale };
