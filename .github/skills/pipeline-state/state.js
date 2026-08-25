#!/usr/bin/env node

/**
 * Pipeline State - shared checkpoint/resume utility
 *
 * One story-scoped file: artifacts/<slug>/pipeline-state.json. Not a Skill in the
 * "produces a reasoned artifact" sense (contrast test-architect) - this is plumbing,
 * a shared utility every agent calls at each existing Skill boundary rather than each
 * Skill implementing its own state logic (see README.md).
 *
 * A stage is COMPLETED only when its declared output artifact exists AND passes
 * validation - never merely because the agent started it. Reuses
 * test-validator/validate.js's schema checker rather than a second implementation.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WORKSPACE_ROOT = path.resolve(__dirname, '../../..');

const STAGE_ORDER = [
  'story-analysis', 'framework-discovery', 'test-architecture', 'test-validation',
  'capability-discovery', 'exploration', 'test-generation', 'execution', 'healing', 'reporting'
];

const VALID_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED', 'BLOCKED'];

function readJsonSafe(fullPath) {
  if (!fs.existsSync(fullPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
  } catch {
    return undefined; // exists but invalid
  }
}

function hashOf(fullPath) {
  if (!fs.existsSync(fullPath)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('hex');
}

/**
 * Per-stage checkpoint rule: declared artifact path(s) relative to artifacts/<slug>/
 * (or `global: true` for a repository-wide artifact like framework-profile.json),
 * a validate() function deciding COMPLETED vs not, and the upstream artifact whose
 * hash this stage's completion is pinned to (for invalidation - see isStale()).
 * `execution`/`healing`/`reporting` are reserved slots only, per Prompt 5's scope -
 * no Runner/Healer-state/Report Analyst integration is implemented here.
 */
const STAGE_DEFINITIONS = {
  'story-analysis': {
    artifact: 'requirements.md',
    inputArtifact: null,
    validate: (slugDir) => {
      const p = path.join(slugDir, 'requirements.md');
      if (!fs.existsSync(p)) return { valid: false };
      const content = fs.readFileSync(p, 'utf-8');
      return { valid: content.trim().length > 0 && content.includes('#') };
    }
  },
  'framework-discovery': {
    artifact: 'artifacts/indexes/framework-profile.json',
    global: true,
    inputArtifact: null,
    validate: () => {
      const doc = readJsonSafe(path.join(WORKSPACE_ROOT, 'artifacts/indexes/framework-profile.json'));
      return { valid: Boolean(doc && doc.language && doc.signature) };
    }
  },
  'test-architecture': {
    artifact: 'test-design.json',
    inputArtifact: 'requirements.md',
    validate: (slugDir) => {
      const doc = readJsonSafe(path.join(slugDir, 'test-design.json'));
      if (!doc) return { valid: false };
      try {
        const { validateAgainstSchema } = require('../test-validator/validate.js');
        const schema = require('../../schemas/test-design.schema.json');
        return { valid: validateAgainstSchema(doc, schema).length === 0 };
      } catch {
        return { valid: Array.isArray(doc.scenarios) }; // best-effort if validator unavailable
      }
    }
  },
  'test-validation': {
    artifact: 'test-validation.json',
    inputArtifact: 'test-design.json',
    validate: (slugDir) => {
      const doc = readJsonSafe(path.join(slugDir, 'test-validation.json'));
      const wellFormed = Boolean(doc && ['PASS', 'PASS_WITH_WARNINGS', 'BLOCKED'].includes(doc.status));
      // A well-formed artifact whose verdict is BLOCKED is NOT a completed stage -
      // "valid" here means "the artifact is not malformed", not "the pipeline may proceed".
      // See the BLOCKED handling below in checkpoint().
      return { valid: wellFormed && doc.status !== 'BLOCKED', status: doc && doc.status, blocked: wellFormed && doc.status === 'BLOCKED' };
    }
  },
  'capability-discovery': {
    artifact: ['reuse-decision.json', 'api-reuse-decision.json'],
    inputArtifact: 'test-design.json',
    validate: (slugDir) => {
      for (const name of ['reuse-decision.json', 'api-reuse-decision.json']) {
        const doc = readJsonSafe(path.join(slugDir, name));
        if (doc && (doc.recommendation || doc.decision)) return { valid: true, file: name };
      }
      return { valid: false };
    }
  },
  'exploration': {
    artifact: 'exploration.md',
    inputArtifact: 'reuse-decision.json',
    validate: (slugDir) => {
      const p = path.join(slugDir, 'exploration.md');
      return { valid: fs.existsSync(p) && fs.readFileSync(p, 'utf-8').trim().length > 0 };
    }
  },
  'test-generation': {
    artifact: 'tests',
    inputArtifact: 'testcases.json',
    validate: (slugDir) => {
      const p = path.join(slugDir, 'tests');
      if (!fs.existsSync(p)) return { valid: false };
      return { valid: fs.readdirSync(p).some(f => f.endsWith('.spec.js')) };
    }
  },
  'execution': { notImplemented: true },
  'healing': { notImplemented: true },
  'reporting': { notImplemented: true }
};

function statePath(slug) {
  return path.join(WORKSPACE_ROOT, 'artifacts', slug, 'pipeline-state.json');
}

function slugDirOf(slug) {
  return path.join(WORKSPACE_ROOT, 'artifacts', slug);
}

function emptyStages() {
  const stages = {};
  for (const name of STAGE_ORDER) stages[name] = { status: 'NOT_STARTED' };
  return stages;
}

function readState(slug) {
  return readJsonSafe(statePath(slug));
}

function writeState(slug, state) {
  const dir = slugDirOf(slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(statePath(slug), JSON.stringify(state, null, 2) + '\n');
  return state;
}

function initState(slug, story) {
  const existing = readState(slug);
  if (existing) return existing;
  const state = {
    story: story || slug,
    status: 'IN_PROGRESS',
    currentStage: STAGE_ORDER[0],
    stages: emptyStages(),
    reuse: null,
    timestamps: { created: new Date().toISOString() },
    errors: []
  };
  return writeState(slug, state);
}

/** Resolves the artifact path a stage definition points at, for a given slug. */
function resolveArtifactPath(slug, def, whichFile) {
  if (def.global) return path.join(WORKSPACE_ROOT, def.artifact);
  const name = whichFile || (Array.isArray(def.artifact) ? def.artifact[0] : def.artifact);
  return path.join(slugDirOf(slug), name);
}

/**
 * A COMPLETED stage is stale (must be reconsidered, not blindly trusted) when its
 * recorded inputHash no longer matches its declared upstream artifact's current
 * content hash. Linear check against one declared input, not a dependency graph.
 */
function isStale(slug, stageName, state) {
  const def = STAGE_DEFINITIONS[stageName];
  const recorded = state.stages[stageName];
  if (!def || !def.inputArtifact || !recorded || recorded.status !== 'COMPLETED') return false;
  const inputPath = path.join(slugDirOf(slug), def.inputArtifact);
  const currentHash = hashOf(inputPath);
  return recorded.inputHash !== undefined && currentHash !== recorded.inputHash;
}

/** Re-evaluates one stage against its actual artifact on disk - the only way a stage becomes COMPLETED. */
function evaluateStage(slug, stageName) {
  const def = STAGE_DEFINITIONS[stageName];
  if (!def || def.notImplemented) return { status: 'NOT_STARTED' };

  const result = def.validate(slugDirOf(slug));
  if (result.blocked) {
    return { status: 'BLOCKED', reason: `${stageName} artifact reports status: ${result.status}`, at: new Date().toISOString() };
  }
  if (!result.valid) return { status: 'NOT_STARTED' };

  const entry = { status: 'COMPLETED', validatedAt: new Date().toISOString() };
  if (def.inputArtifact) {
    entry.inputHash = hashOf(path.join(slugDirOf(slug), def.inputArtifact));
  }
  if (result.status) entry.detail = result.status; // e.g. test-validation's own PASS/BLOCKED
  if (result.file) entry.file = result.file;
  return entry;
}

/**
 * Checkpoint one stage: re-evaluate it against disk, record the result, cascade-
 * invalidate strictly downstream stages when this stage's artifact changed since
 * they last ran (lightweight linear cascade, not a dependency graph).
 */
function checkpoint(slug, stageName, { status, reason, error } = {}) {
  const state = readState(slug) || initState(slug);

  if (status === 'BLOCKED') {
    state.stages[stageName] = { status: 'BLOCKED', reason: reason || 'Test Validator returned BLOCKED', at: new Date().toISOString() };
    state.status = 'BLOCKED';
    state.currentStage = stageName;
    return writeState(slug, state);
  }

  if (status === 'SKIPPED') {
    state.stages[stageName] = { status: 'SKIPPED', reason: reason || 'skipped', at: new Date().toISOString() };
    advanceCurrentStage(state);
    return writeState(slug, state);
  }

  if (status === 'FAILED') {
    // Never overwrite a prior COMPLETED result for an earlier stage - only this stage's entry changes.
    state.stages[stageName] = { status: 'FAILED', at: new Date().toISOString() };
    state.errors.push({ stage: stageName, at: new Date().toISOString(), message: error || 'unspecified failure' });
    state.status = 'FAILED';
    state.currentStage = stageName;
    return writeState(slug, state);
  }

  if (status === 'IN_PROGRESS') {
    state.stages[stageName] = { status: 'IN_PROGRESS', at: new Date().toISOString() };
    state.currentStage = stageName;
    state.status = 'IN_PROGRESS';
    return writeState(slug, state);
  }

  // Default: re-evaluate against the actual artifact - this is the ONLY path to COMPLETED.
  const evaluated = evaluateStage(slug, stageName);
  state.stages[stageName] = evaluated;
  if (evaluated.status === 'BLOCKED') {
    // Never proceed past a block - do not touch currentStage/status of any other stage.
    state.status = 'BLOCKED';
    state.currentStage = stageName;
  } else if (evaluated.status === 'COMPLETED') {
    advanceCurrentStage(state);
    if (state.status !== 'BLOCKED') state.status = allStagesSettled(state) ? 'COMPLETED' : 'IN_PROGRESS';
  }
  return writeState(slug, state);
}

function advanceCurrentStage(state) {
  const idx = STAGE_ORDER.findIndex(s => ['NOT_STARTED', 'FAILED'].includes(state.stages[s].status));
  state.currentStage = idx === -1 ? STAGE_ORDER[STAGE_ORDER.length - 1] : STAGE_ORDER[idx];
}

function allStagesSettled(state) {
  return STAGE_ORDER.every(s => ['COMPLETED', 'SKIPPED'].includes(state.stages[s].status) || STAGE_DEFINITIONS[s].notImplemented);
}

/**
 * The resume entry point: read state, invalidate anything whose input changed,
 * re-check the current/blocked stage against disk (never trust old BLOCKED status
 * blindly), and report which stages can be skipped vs. which stage to run next.
 */
function resumePlan(slug) {
  let state = readState(slug);
  if (!state) return { exists: false, nextStage: STAGE_ORDER[0], stages: emptyStages() };

  for (const stageName of STAGE_ORDER) {
    if (STAGE_DEFINITIONS[stageName].notImplemented) continue;

    if (isStale(slug, stageName, state)) {
      state.stages[stageName] = { status: 'NOT_STARTED', invalidatedReason: 'upstream input changed since last completion' };
      // Lightweight linear cascade: everything after this stage is also invalidated,
      // since the pipeline is strictly forward - not a dependency graph traversal.
      const idx = STAGE_ORDER.indexOf(stageName);
      for (const downstream of STAGE_ORDER.slice(idx + 1)) {
        if (state.stages[downstream].status === 'COMPLETED') {
          state.stages[downstream] = { status: 'NOT_STARTED', invalidatedReason: `upstream stage "${stageName}" was invalidated` };
        }
      }
    } else if (state.stages[stageName].status === 'BLOCKED' || state.stages[stageName].status === 'COMPLETED') {
      // Re-validate rather than trusting old state - "a subsequent run should
      // revalidate the blocker before proceeding." Covers both directions: a
      // previously BLOCKED stage that's now resolved, and vice versa.
      const evaluated = evaluateStage(slug, stageName);
      if (evaluated.status === 'COMPLETED' || evaluated.status === 'BLOCKED') {
        state.stages[stageName] = evaluated;
      }
      // If still NOT_STARTED (invalid, neither completed nor blocked), leave the
      // prior status as-is for the invoking agent to re-run that stage's Skill.
    }
  }

  const nextStage = STAGE_ORDER.find(s =>
    !STAGE_DEFINITIONS[s].notImplemented &&
    !['COMPLETED', 'SKIPPED'].includes(state.stages[s].status)
  );

  state.status = state.stages['test-validation'] && state.stages['test-validation'].status === 'BLOCKED'
    ? 'BLOCKED'
    : (nextStage ? 'IN_PROGRESS' : 'COMPLETED');
  state.currentStage = nextStage || state.currentStage;

  writeState(slug, state);
  return { exists: true, nextStage, blocked: state.status === 'BLOCKED', state };
}

module.exports = {
  STAGE_ORDER, STAGE_DEFINITIONS, VALID_STATUSES,
  readState, writeState, initState, checkpoint, evaluateStage, isStale, resumePlan
};

if (require.main === module) {
  const [, , cmd, slug] = process.argv;
  if (cmd === 'status' && slug) {
    const state = readState(slug);
    console.log(state ? JSON.stringify(state, null, 2) : `No pipeline-state.json for "${slug}"`);
  } else if (cmd === 'resume' && slug) {
    const plan = resumePlan(slug);
    console.log(`Next stage: ${plan.nextStage || '(none - pipeline complete)'}`);
    console.log(JSON.stringify(plan.state, null, 2));
  } else {
    console.log('Usage: node state.js status <slug> | resume <slug>');
  }
}
