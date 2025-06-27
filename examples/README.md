# API Tools MCP Examples

This directory contains example API schema files demonstrating various features of API Tools MCP.

## Available Examples

### 1. GitHub API (`github-api.yaml`)
- Real-world REST API example
- Path parameters (`{username}`)
- Query parameters with enums
- Multiple endpoints
- Detailed response examples

### 2. OpenWeatherMap API (`weather-api.yaml`)
- External API requiring authentication
- Global headers configuration
- Query parameters with default values
- Enum validation for units
- Error response definitions

### 3. JSONPlaceholder API (`jsonplaceholder-api.yaml`)
- Complete CRUD operations
- Request body examples
- POST/PUT/DELETE methods
- Test metadata tracking
- Free API for testing

## Testing the Examples

### Quick Test
```bash
# List available APIs
api-tools-mcp list

# Test an API endpoint
api-tools-mcp list --test
```

### Test with Live API
```bash
# Test GitHub API
api-tools-mcp add
> Choose "Test a live API endpoint"
> Enter URL: https://api.github.com/users/octocat

# Test JSONPlaceholder
api-tools-mcp add
> Choose "Test a live API endpoint"  
> Enter URL: https://jsonplaceholder.typicode.com/posts/1
```

### Import OpenAPI Spec
```bash
# Import Petstore example
api-tools-mcp import https://petstore.swagger.io/v2/swagger.json --name "Petstore API"
```

## Using with MCP

These examples work directly with Claude Desktop or any MCP-compatible client:

```json
{
  "mcpServers": {
    "api-tools": {
      "command": "npx",
      "args": ["api-tools-mcp-server"],
      "env": {
        "APITOOLSMCP_SCHEMA_DIR": "/path/to/examples"
      }
    }
  }
}
```

## Creating Your Own Schemas

Use these examples as templates for your own API schemas:

1. Copy an example file
2. Update the metadata (id, name, baseURL)
3. Define your endpoints
4. Add parameters and responses
5. Test with `api-tools-mcp validate`

## Tips

- Use the `source: tested` metadata when you've tested the API
- Include example responses for better AI understanding
- Use enums for parameters with fixed values
- Document error responses (401, 404, etc.)
- Add global headers for authentication