#!/usr/bin/env node

/**
 * This script starts the API server for the GLMCMS application.
 * It handles environment setup and provides clear feedback.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Path to the server directory
const serverDir = path.join(__dirname, 'server');

// Check if server directory exists
if (!fs.existsSync(serverDir)) {
  console.error('\x1b[31mError: Server directory not found!\x1b[0m');
  console.error(`Expected server directory at: ${serverDir}`);
  process.exit(1);
}

// Check if .env file exists in server directory
const envPath = path.join(serverDir, '.env');
if (!fs.existsSync(envPath)) {
  console.log('\x1b[33mWarning: No .env file found in server directory.\x1b[0m');
  console.log('Creating a basic .env file from .env.example...');
  
  // Try to copy from .env.example
  const exampleEnvPath = path.join(serverDir, '.env.example');
  if (fs.existsSync(exampleEnvPath)) {
    fs.copyFileSync(exampleEnvPath, envPath);
    console.log('\x1b[32mCreated .env file from .env.example.\x1b[0m');
    console.log('\x1b[33mPlease edit the .env file to add your Supabase credentials.\x1b[0m');
  } else {
    console.error('\x1b[31mError: No .env.example file found!\x1b[0m');
    console.error('Please create a .env file in the server directory with your Supabase credentials.');
    process.exit(1);
  }
}

// Command to run
const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = ['run', 'dev'];

console.log('\x1b[36m=================================================\x1b[0m');
console.log('\x1b[36m Starting GLMCMS API Server...\x1b[0m');
console.log('\x1b[36m=================================================\x1b[0m');
console.log(`Working directory: ${serverDir}`);
console.log(`Command: ${command} ${args.join(' ')}`);
console.log('\x1b[36m=================================================\x1b[0m');

// Spawn the process
const serverProcess = spawn(command, args, {
  cwd: serverDir,
  stdio: 'inherit'
});

// Handle process events
serverProcess.on('error', (error) => {
  console.error(`\x1b[31mFailed to start server: ${error.message}\x1b[0m`);
});

serverProcess.on('close', (code) => {
  if (code === 0) {
    console.log('\x1b[32mServer process exited successfully.\x1b[0m');
  } else {
    console.log(`\x1b[31mServer process exited with code ${code}\x1b[0m`);
  }
});

console.log('\x1b[32mServer process started. Press Ctrl+C to stop.\x1b[0m');
