#!/usr/bin/env node

/**
 * Pre-Commit Hook - Index Validation
 * 
 * Validates capability indexes before allowing commit.
 * Ensures source code changes are reflected in indexes.
 * 
 * Installation:
 *   cp .github/hooks/pre-commit.js .git/hooks/pre-commit
 *   chmod +x .git/hooks/pre-commit
 * 
 * Or use Husky:
 *   npx husky add .husky/pre-commit "node .github/hooks/pre-commit.js"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WORKSPACE_ROOT = path.resolve(__dirname, '../..');

console.log('\n🔄 Pre-Commit Hook: Validating Capability Indexes...\n');

try {
  // Get list of staged files
  const stagedFiles = execSync('git diff --cached --name-only', { 
    encoding: 'utf-8',
    cwd: WORKSPACE_ROOT
  }).trim().split('\n').filter(Boolean);
  
  console.log(`📝 Staged files: ${stagedFiles.length}`);
  
  // Check if any Page Object files are being committed
  const pageObjectFiles = stagedFiles.filter(f => 
    f.startsWith('page-objects/') && f.endsWith('.js')
  );
  
  if (pageObjectFiles.length === 0) {
    console.log('✅ No Page Object changes detected, skipping index validation\n');
    process.exit(0);
  }
  
  console.log(`\n📂 Page Object changes detected: ${pageObjectFiles.length}`);
  for (const file of pageObjectFiles) {
    console.log(`   • ${file}`);
  }
  
  // Run validator
  console.log('\n🔍 Running index validator...\n');
  
  const { IndexValidator } = require('../capabilities/validator.js');
  const validator = new IndexValidator({ 
    verbose: true,
    fix: false,  // Don't auto-fix in pre-commit (let developer decide)
    ci: false
  });
  
  const isHealthy = await validator.validate();
  
  if (!isHealthy) {
    console.error('\n❌ Index validation failed!\n');
    console.error('⚠️  Indexes are out of sync with source code.\n');
    console.error('To fix, run one of:');
    console.error('  1. node .github/capabilities/validator.js --fix');
    console.error('  2. node .github/capabilities/generator.js --full-scan');
    console.error('\nThen stage the updated indexes:');
    console.error('  git add artifacts/indexes/\n');
    console.error('Commit rejected. Please fix indexes before committing.\n');
    process.exit(1);
  }
  
  // Check if index files need to be staged
  const indexFiles = stagedFiles.filter(f => 
    f.startsWith('artifacts/indexes/')
  );
  
  if (pageObjectFiles.length > 0 && indexFiles.length === 0) {
    console.warn('\n⚠️  WARNING: Page Objects changed but no indexes staged!\n');
    console.warn('Did you forget to update indexes?');
    console.warn('Run: node .github/capabilities/generator.js --full-scan');
    console.warn('Then: git add artifacts/indexes/\n');
    
    // Allow commit but warn
    console.log('⚠️  Allowing commit, but please update indexes soon!\n');
    process.exit(0);
  }
  
  console.log('\n✅ Index validation passed!');
  console.log('✅ Indexes are consistent with source code.\n');
  
  process.exit(0);
  
} catch (error) {
  console.error('\n❌ Pre-commit hook error:', error.message);
  console.error('\n⚠️  Validation failed, but allowing commit (safe fallback)');
  console.error('Please run validation manually:');
  console.error('  node .github/capabilities/validator.js\n');
  
  // Allow commit on hook error (fail safe)
  process.exit(0);
}
