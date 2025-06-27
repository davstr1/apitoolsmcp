const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('Demo: OpenAPI Auto-Discovery\n');

// Create a sample OpenAPI file
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Demo API',
    version: '1.0.0',
    description: 'A demo API found by auto-discovery'
  },
  servers: [
    { url: 'https://demo.example.com/api' }
  ],
  paths: {
    '/users': {
      get: {
        summary: 'List users',
        responses: {
          '200': {
            description: 'Success',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
};

// Create docs directory with OpenAPI file
const docsDir = path.join(__dirname, 'docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir);
}

fs.writeFileSync(
  path.join(docsDir, 'openapi.json'),
  JSON.stringify(openApiSpec, null, 2)
);

console.log('Created sample OpenAPI file at: docs/openapi.json\n');

// Run list command with empty schema directory to trigger discovery
const cliPath = path.join(__dirname, '..', 'dist', 'cli', 'index.js');
const emptyDir = path.join(__dirname, 'empty-schemas');

if (!fs.existsSync(emptyDir)) {
  fs.mkdirSync(emptyDir);
}

exec(`node ${cliPath} list`, {
  cwd: __dirname,
  env: { ...process.env, APITOOLSMCP_SCHEMA_DIR: emptyDir }
}, (error, stdout, stderr) => {
  console.log(stdout);
  
  // Clean up
  setTimeout(() => {
    fs.rmSync(docsDir, { recursive: true, force: true });
    fs.rmSync(emptyDir, { recursive: true, force: true });
    console.log('\nDemo cleanup complete.');
  }, 100);
});