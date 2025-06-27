const { spawn } = require('child_process');
const path = require('path');

console.log('Demo: Adding API from URL\n');

const cliPath = path.join(__dirname, '..', 'dist', 'cli', 'index.js');

// Create a demo showing the add command with URL option
const demo = spawn('node', [cliPath, 'add'], {
  stdio: ['pipe', 'inherit', 'inherit'],
  env: { ...process.env, APITOOLSMCP_SCHEMA_DIR: path.join(__dirname, 'demo-schemas') }
});

// Simulate user input
setTimeout(() => {
  // Select "Test a live API endpoint"
  demo.stdin.write('\n');
}, 1000);

setTimeout(() => {
  // Enter URL (using a test API)
  demo.stdin.write('https://jsonplaceholder.typicode.com/posts/1\n');
}, 2000);

setTimeout(() => {
  console.log('\nNote: This would continue with interactive prompts for:');
  console.log('- API ID and name');
  console.log('- HTTP method selection');
  console.log('- Header configuration');
  console.log('- Parameter configuration');
  console.log('- Live API testing');
  console.log('- Schema generation from response\n');
  
  // Exit the demo
  demo.kill();
}, 3000);