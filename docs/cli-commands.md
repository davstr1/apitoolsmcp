# CLI Commands Reference

The API Tools MCP CLI provides commands for managing API schemas.

## Global Options

- `--version` - Show version number
- `--help` - Show help

## Commands

### `add`

Add a new API schema interactively.

```bash
api-tools-mcp add
```

This command will prompt you for:
- API ID (unique identifier)
- API Name
- Version
- Description (optional)
- Base URL
- Endpoints (you can add multiple)

The schema will be saved as a YAML file in your configured schema directory.

### `edit <apiId>`

Edit an existing API schema.

```bash
api-tools-mcp edit user-api
```

This will:
1. Load the existing schema
2. Show current values in prompts
3. Allow you to update basic information
4. Save the updated schema

Note: Currently only edits basic information. For endpoint editing, modify the YAML file directly.

### `list`

List all available API schemas.

```bash
api-tools-mcp list
```

Options:
- `-s, --search <query>` - Search for APIs by name, description, or ID

Examples:

```bash
# List all APIs
api-tools-mcp list

# Search for APIs containing "user"
api-tools-mcp list --search user

# Search for APIs with "payment" in name or description
api-tools-mcp list -s payment
```

Output shows:
- API ID
- Name
- Version
- Base URL
- Number of endpoints
- Description (if available)

### `validate [path]`

Validate API schema file(s).

```bash
api-tools-mcp validate
api-tools-mcp validate path/to/schema.yaml
api-tools-mcp validate path/to/schemas/
```

This command:
- Validates YAML syntax
- Checks required fields
- Validates field types
- Reports all errors found

Exit codes:
- 0: All schemas valid
- 1: Validation errors found

### `import <url>`

Import an OpenAPI specification from a URL (coming soon).

```bash
api-tools-mcp import https://api.example.com/openapi.json
```

Options:
- `-n, --name <name>` - Specify a name for the imported API

## Configuration

The CLI uses these configuration sources (in order of precedence):

1. Environment variables:
   - `APITOOLSMCP_SCHEMA_DIR` - Directory for API schemas
   - `APITOOLSMCP_CONFIG_PATH` - Path to config file

2. Config files (first found):
   - `./.apitoolsmcp.json`
   - `./.apitoolsmcp.yaml`
   - `~/.apitoolsmcp.json`
   - `~/.apitoolsmcp.yaml`

3. Default values:
   - Schema directory: `./api-schemas`

## Examples

### Complete Workflow

```bash
# 1. Create a new API
api-tools-mcp add

# 2. List all APIs
api-tools-mcp list

# 3. Validate all schemas
api-tools-mcp validate

# 4. Edit an API
api-tools-mcp edit my-api

# 5. Search for specific APIs
api-tools-mcp list --search payment
```

### Using with Custom Directory

```bash
# Set schema directory via environment variable
export APITOOLSMCP_SCHEMA_DIR=/path/to/my/apis
api-tools-mcp list

# Or create a config file
echo '{"schemaDirectory": "/path/to/my/apis"}' > .apitoolsmcp.json
api-tools-mcp list
```

## Troubleshooting

### No APIs Found

If `list` shows no APIs:
1. Check your schema directory exists
2. Verify `.yaml` or `.yml` files are present
3. Run `validate` to check for parsing errors

### Validation Errors

Common validation errors:
- Missing required fields (id, name, version, baseURL)
- Invalid endpoint methods
- Incorrect parameter types

### Permission Errors

If you get permission errors:
1. Check write permissions on schema directory
2. Ensure the directory exists
3. Try creating it manually: `mkdir -p api-schemas`