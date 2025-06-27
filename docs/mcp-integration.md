# MCP Integration Guide

This guide explains how to integrate API Tools MCP with AI assistants using the Model Context Protocol.

## Overview

API Tools MCP exposes your API schemas to AI assistants through MCP tools. This allows AI to:
- Discover available APIs
- Understand API structures
- Generate correct API calls
- Provide API documentation

## Available MCP Tools

### `listAPIs`

Lists all available API schemas.

**Parameters:**
- `search` (optional): Search query to filter APIs

**Returns:** Array of API summaries with:
- `id`: Unique API identifier
- `name`: API name
- `version`: API version
- `description`: API description
- `baseURL`: Base URL
- `endpointCount`: Number of endpoints

### `getAPISchema`

Gets complete details of a specific API.

**Parameters:**
- `apiId` (required): The API identifier

**Returns:** Complete API schema including all endpoints, parameters, and authentication details.

### `getEndpoint`

Gets details about a specific endpoint.

**Parameters:**
- `apiId` (required): The API identifier
- `path` (required): The endpoint path
- `method` (required): HTTP method (GET, POST, etc.)

**Returns:** Endpoint details including parameters, headers, request/response formats.

## Claude Desktop Integration

### 1. Install API Tools MCP

```bash
npm install -g api-tools-mcp
```

### 2. Configure Claude Desktop

Add to your Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "api-tools": {
      "command": "npx",
      "args": ["api-tools-mcp-server"],
      "env": {
        "APITOOLSMCP_SCHEMA_DIR": "/absolute/path/to/your/api-schemas"
      }
    }
  }
}
```

### 3. Create API Schemas

Create a directory for your schemas:

```bash
mkdir ~/api-schemas
cd ~/api-schemas
```

Create a sample schema `github-api.yaml`:

```yaml
id: github-api
name: GitHub API
version: 3.0.0
description: GitHub REST API v3
baseURL: https://api.github.com
globalHeaders:
  - name: Accept
    value: application/vnd.github.v3+json
    required: true
endpoints:
  - path: /users/{username}
    method: GET
    description: Get a user
    parameters:
      - name: username
        type: string
        required: true
        description: GitHub username
  - path: /users/{username}/repos
    method: GET
    description: List user repositories
    parameters:
      - name: username
        type: string
        required: true
        description: GitHub username
      - name: type
        type: string
        required: false
        enum: [all, owner, member]
        default: owner
      - name: sort
        type: string
        required: false
        enum: [created, updated, pushed, full_name]
        default: created
```

### 4. Restart Claude Desktop

After configuration, restart Claude Desktop to load the MCP server.

### 5. Using in Claude

You can now ask Claude about your APIs:

- "What APIs are available?"
- "Show me the GitHub API endpoints"
- "How do I get a user's repositories using the GitHub API?"
- "Generate a curl command for the GitHub user endpoint"

## Programmatic Integration

### Starting the MCP Server

```javascript
const { MCPServer } = require('api-tools-mcp');
const { getConfig } = require('api-tools-mcp/config/loader');

async function startServer() {
  const config = await getConfig();
  const server = new MCPServer(config);
  
  await server.start();
  console.log('MCP Server started');
  
  // Handle shutdown
  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });
}

startServer();
```

### Custom Configuration

```javascript
const { MCPServer } = require('api-tools-mcp');

const config = {
  schemaDirectory: '/path/to/schemas',
  validation: {
    strict: true
  }
};

const server = new MCPServer(config);
await server.start();
```

## AI Assistant Usage Examples

### Discovering APIs

**Human:** "What APIs do you have access to?"

**AI uses:** `listAPIs` tool

**Response:** "I have access to the following APIs:
1. GitHub API (v3.0.0) - GitHub REST API v3
2. Stripe API (v1.0.0) - Payment processing API
..."

### Getting API Details

**Human:** "Show me how to create a user using the User API"

**AI uses:** `getAPISchema` with `apiId: "user-api"`

**Response:** "To create a user, send a POST request to `/users` with the following body:
```json
{
  "name": "John Doe",
  "email": "john@example.com"
}
```
..."

### Generating Code

**Human:** "Generate Python code to get a GitHub user"

**AI uses:** `getEndpoint` with `apiId: "github-api"`, `path: "/users/{username}"`, `method: "GET"`

**Response:** 
```python
import requests

def get_github_user(username):
    url = f"https://api.github.com/users/{username}"
    headers = {
        "Accept": "application/vnd.github.v3+json"
    }
    response = requests.get(url, headers=headers)
    return response.json()
```

## Best Practices

1. **Organize APIs Logically**: Group related endpoints in the same schema file
2. **Use Clear Descriptions**: Help AI understand what each endpoint does
3. **Include Examples**: Add example requests/responses in your schemas
4. **Document Authentication**: Clearly specify auth requirements
5. **Version Your APIs**: Use semantic versioning for your schemas
6. **Validate Regularly**: Run `api-tools-mcp validate` to ensure schemas are correct

## Troubleshooting

### MCP Server Not Available in Claude

1. Check Claude Desktop logs for errors
2. Verify the command path is correct
3. Ensure schema directory exists and is readable
4. Try running the server manually: `npx api-tools-mcp-server`

### Schemas Not Loading

1. Check schema directory path is absolute
2. Verify YAML files are valid: `api-tools-mcp validate`
3. Check file permissions
4. Look for parsing errors in logs

### Tool Errors

If tools return errors:
1. Check the MCP server is running
2. Verify API IDs are correct
3. Ensure schemas are valid
4. Check server logs for detailed error messages