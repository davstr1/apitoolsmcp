const { exec } = require('child_process');
const path = require('path');

console.log('Testing API Tools MCP CLI...\n');

const cliPath = path.join(__dirname, '..', 'dist', 'cli', 'index.js');

// Set environment variable for schema directory
process.env.APITOOLSMCP_SCHEMA_DIR = path.join(__dirname, 'schemas');

// Test list command
console.log('1. Testing list command:');
exec(`node ${cliPath} list`, { 
  cwd: __dirname,
  env: { ...process.env, APITOOLSMCP_SCHEMA_DIR: path.join(__dirname, 'schemas') }
}, (error, stdout, stderr) => {
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log(stdout);
  
  // Test validate command
  console.log('\n2. Testing validate command:');
  exec(`node ${cliPath} validate schemas`, { cwd: __dirname }, (error, stdout, stderr) => {
    if (error) {
      console.error('Error:', error);
      return;
    }
    console.log(stdout);
    
    // Test help
    console.log('\n3. Testing help:');
    exec(`node ${cliPath} --help`, { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error('Error:', error);
        return;
      }
      console.log(stdout);
    });
  });
});