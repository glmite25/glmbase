/**
 * Fix Git Remote Repository Issues
 * This script helps diagnose and fix Git remote problems
 */

import { execSync } from 'child_process';

console.log('🔧 Git Remote Repository Fix');
console.log('============================');

function runCommand(command, description) {
  try {
    console.log(`\n📋 ${description}`);
    console.log(`Command: ${command}`);
    const result = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log('✅ Success:');
    console.log(result.trim());
    return { success: true, output: result.trim() };
  } catch (error) {
    console.log('❌ Error:');
    console.log(error.message);
    return { success: false, error: error.message };
  }
}

function fixGitRemote() {
  console.log('🔍 Diagnosing Git remote issues...\n');
  
  // Step 1: Check current remotes
  const remoteCheck = runCommand('git remote -v', 'Checking current remotes');
  
  // Step 2: Check if we're in a git repository
  const gitCheck = runCommand('git status', 'Checking git repository status');
  
  if (!gitCheck.success) {
    console.log('\n❌ Not in a Git repository. Initializing...');
    runCommand('git init', 'Initializing Git repository');
  }
  
  // Step 3: Remove existing origin if it exists
  console.log('\n🔧 Fixing remote origin...');
  runCommand('git remote remove origin', 'Removing existing origin (if exists)');
  
  // Step 4: Provide solutions
  console.log('\n🎯 SOLUTIONS:');
  console.log('=============');
  
  console.log('\n1️⃣ CREATE NEW REPOSITORY:');
  console.log('   Go to https://github.com/gigscode');
  console.log('   Click "New repository"');
  console.log('   Name: glm_database');
  console.log('   Make it private if needed');
  console.log('   Click "Create repository"');
  
  console.log('\n2️⃣ ADD CORRECT REMOTE:');
  console.log('   After creating the repo, run:');
  console.log('   git remote add origin https://github.com/gigscode/glm_database.git');
  
  console.log('\n3️⃣ ALTERNATIVE - USE DIFFERENT REPO NAME:');
  console.log('   If glm_database is taken, try:');
  console.log('   git remote add origin https://github.com/gigscode/gospel-labour-ministry.git');
  console.log('   git remote add origin https://github.com/gigscode/glm-cms.git');
  console.log('   git remote add origin https://github.com/gigscode/church-management-system.git');
  
  console.log('\n4️⃣ CHECK REPOSITORY ACCESS:');
  console.log('   Make sure you have access to the gigscode organization');
  console.log('   Or use your personal GitHub account:');
  console.log('   git remote add origin https://github.com/YOUR_USERNAME/glm_database.git');
  
  console.log('\n5️⃣ COMPLETE SETUP COMMANDS:');
  console.log('   # After creating the repository:');
  console.log('   git add .');
  console.log('   git commit -m "Initial commit - Gospel Labour Ministry CMS"');
  console.log('   git branch -M main');
  console.log('   git remote add origin https://github.com/gigscode/glm_database.git');
  console.log('   git push -u origin main');
  
  // Step 5: Check current branch
  runCommand('git branch', 'Checking current branch');
  
  // Step 6: Check if there are uncommitted changes
  runCommand('git status --porcelain', 'Checking for uncommitted changes');
  
  console.log('\n📋 QUICK FIX STEPS:');
  console.log('==================');
  console.log('1. Create the repository on GitHub first');
  console.log('2. Run: git remote add origin [YOUR_REPO_URL]');
  console.log('3. Run: git add .');
  console.log('4. Run: git commit -m "Initial commit"');
  console.log('5. Run: git push -u origin main');
  
  console.log('\n⚠️  COMMON ISSUES:');
  console.log('- Repository doesn\'t exist on GitHub');
  console.log('- No access to gigscode organization');
  console.log('- Repository name already taken');
  console.log('- Wrong GitHub username/organization');
}

fixGitRemote();