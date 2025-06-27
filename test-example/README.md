# API Tools MCP Test Example

This directory contains test examples for the API Tools MCP module.

## Setup

1. First, build the main project:
   ```bash
   cd ..
   npm run build
   ```

2. Install dependencies in this test directory:
   ```bash
   npm install
   ```

3. Link the local module (optional, for testing without building):
   ```bash
   npm run setup
   ```

## Testing

### Test CLI Commands

```bash
npm run test-cli
```

This will test:
- Listing API schemas
- Validating schemas
- Showing help

### Test MCP Server

```bash
npm run test-server
```

This will:
- Load the configuration
- Create an MCP server instance
- Load and display schemas

### Test with Claude Desktop

1. Copy the `claude-config.json` to your Claude Desktop configuration directory
2. Update the paths as needed
3. Restart Claude Desktop
4. The API tools should be available in Claude

## Sample Schemas

The `schemas/` directory contains sample API definitions:

- `sample-rest-api.yaml` - A typical REST API with CRUD operations
- `sample-webhook-api.yaml` - Webhook endpoint definitions with authentication

## Manual CLI Testing

After building the main project, you can test individual commands:

```bash
# List all APIs
node ../dist/cli/index.js list

# Validate schemas
node ../dist/cli/index.js validate schemas/

# Add a new API (interactive)
node ../dist/cli/index.js add

# Get help
node ../dist/cli/index.js --help
```