import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the server directory
const serverDir = join(__dirname, 'server');

// Command to run
const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const args = ['run', 'dev'];

console.log(`Starting server in ${serverDir}...`);

// Spawn the process
const serverProcess = spawn(command, args, {
  cwd: serverDir,
  stdio: 'inherit'
});

// Handle process events
serverProcess.on('error', (error) => {
  console.error(`Failed to start server: ${error.message}`);
});

serverProcess.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

console.log('Server process started. Press Ctrl+C to stop.');
