#!/usr/bin/env node

/**
 * Simple Authentication Verification Test Runner
 * Can be run via npm script: npm run auth:verify
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🧪 Running Authentication Verification Tests...\n');

try {
  // Run the comprehensive test script
  const testScript = join(projectRoot, 'test-authentication-verification.js');
  execSync(`node "${testScript}"`, { 
    stdio: 'inherit',
    cwd: projectRoot 
  });
  
  console.log('\n✅ Authentication verification completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('\n❌ Authentication verification failed!');
  console.error('Error:', error.message);
  process.exit(1);
}