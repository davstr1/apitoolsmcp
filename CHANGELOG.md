# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2024-12-27

### Added
- Initial release of API Tools MCP
- MCP server for serving API schemas to AI assistants
- CLI for managing API schemas (add, edit, list, validate)
- Support for YAML-based API schema definitions
- Configuration via files and environment variables
- Comprehensive test suite
- Full documentation

### Features
- Define APIs using simple YAML format
- Expose API schemas via Model Context Protocol
- Search and filter APIs
- Schema validation
- Configurable schema directory
- Support for global headers and authentication

### MCP Tools
- `listAPIs` - List all available API schemas with optional search
- `getAPISchema` - Get complete details of a specific API
- `getEndpoint` - Get details about a specific endpoint

### CLI Commands
- `add` - Add a new API schema interactively
- `edit <apiId>` - Edit an existing API schema
- `list` - List all API schemas with search support
- `validate [path]` - Validate API schema files
- `import <url>` - Import OpenAPI spec (placeholder for future)