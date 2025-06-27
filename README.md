# API Tools MCP

MCP (Model Context Protocol) server for serving API schemas to AI assistants. This tool allows you to manage API definitions in YAML format and expose them to AI through the MCP protocol.

## Features

- 📝 Define APIs using simple YAML format
- 🤖 Expose API schemas to AI assistants via MCP
- 🛠️ CLI for managing API schemas
- 📦 NPM package for easy integration
- 🔍 Search and filter APIs
- ✅ Schema validation
- 🌐 OpenAPI import support (coming soon)

## Installation

```bash
npm install -g api-tools-mcp
```

Or use locally in a project:

```bash
npm install api-tools-mcp
```

## Quick Start

1. Create a directory for your API schemas:
   ```bash
   mkdir api-schemas
   ```

2. Add a new API schema:
   ```bash
   api-tools-mcp add
   ```

3. List your APIs:
   ```bash
   api-tools-mcp list
   ```

4. Start the MCP server:
   ```bash
   npx api-tools-mcp-server
   ```

## CLI Usage

### Add a new API

```bash
api-tools-mcp add
```

Interactive prompts will guide you through creating a new API schema.

### List APIs

```bash
api-tools-mcp list
api-tools-mcp list --search "user"
```

### Edit an API

```bash
api-tools-mcp edit <api-id>
```

### Validate schemas

```bash
api-tools-mcp validate
api-tools-mcp validate path/to/schema.yaml
```

### Import OpenAPI (coming soon)

```bash
api-tools-mcp import https://api.example.com/openapi.json
```

## Configuration

Create a `.apitoolsmcp.json` file in your project root or home directory:

```json
{
  "schemaDirectory": "./my-apis",
  "remoteImports": {
    "enabled": true,
    "cacheDuration": 3600000
  },
  "validation": {
    "strict": true
  }
}
```

Or use environment variables:

- `APITOOLSMCP_SCHEMA_DIR` - Directory containing API schemas
- `APITOOLSMCP_CONFIG_PATH` - Path to configuration file

## API Schema Format

Example `user-api.yaml`:

```yaml
id: user-api
name: User Management API
version: 1.0.0
description: API for managing users
baseURL: https://api.example.com/v1
endpoints:
  - path: /users
    method: GET
    description: List all users
    parameters:
      - name: page
        type: number
        required: false
        description: Page number
        default: 1
    responses:
      200:
        description: List of users
        contentType: application/json
  - path: /users/{id}
    method: GET
    description: Get user by ID
    parameters:
      - name: id
        type: string
        required: true
        description: User ID
```

## MCP Integration

### With Claude Desktop

1. Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "api-tools": {
      "command": "npx",
      "args": ["api-tools-mcp-server"],
      "env": {
        "APITOOLSMCP_SCHEMA_DIR": "/path/to/your/api-schemas"
      }
    }
  }
}
```

2. Restart Claude Desktop

3. The AI assistant can now access your API schemas using these tools:
   - `listAPIs` - List all available APIs
   - `getAPISchema` - Get detailed schema for a specific API
   - `getEndpoint` - Get details about a specific endpoint

### Programmatic Usage

```javascript
const { MCPServer, SchemaProvider } = require('api-tools-mcp');

const config = {
  schemaDirectory: './api-schemas'
};

const server = new MCPServer(config);
await server.start();
```

## Development

### Setup

```bash
git clone https://github.com/davstr1/apitoolsmcp.git
cd apitoolsmcp
npm install
npm run build
```

### Testing

```bash
npm test
npm run test:watch
```

### Local Development

```bash
npm run dev
```

Test the CLI locally:

```bash
npm link
api-tools-mcp --help
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and feature requests, please use the [GitHub issue tracker](https://github.com/davstr1/apitoolsmcp/issues).