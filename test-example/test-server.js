const path = require('path');

console.log('Testing API Tools MCP Server...\n');

// Set schema directory to our test schemas
process.env.APITOOLSMCP_SCHEMA_DIR = path.join(__dirname, 'schemas');

// Import and create server
const { MCPServer } = require('../dist');
const { getConfig } = require('../dist/config/loader');

async function testServer() {
  try {
    console.log('Loading configuration...');
    const config = await getConfig();
    console.log('Schema directory:', config.schemaDirectory);
    
    console.log('\nCreating MCP server...');
    const server = new MCPServer(config);
    
    // Note: We can't actually start the server in this test because it requires
    // stdio transport which needs to be connected to an MCP client
    console.log('Server created successfully!');
    
    // Test schema provider directly
    const { SchemaProvider } = require('../dist/server/schema-provider');
    const provider = new SchemaProvider(config);
    
    console.log('\nLoading schemas...');
    await provider.loadSchemas();
    
    console.log(`Loaded ${provider.getSchemaCount()} schemas`);
    
    const schemas = provider.listSchemas();
    schemas.forEach(schema => {
      console.log(`\n- ${schema.name} (${schema.id})`);
      console.log(`  Version: ${schema.version}`);
      console.log(`  Base URL: ${schema.baseURL}`);
      console.log(`  Endpoints: ${schema.endpoints.length}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testServer();