# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2024-12-27

### Added
- 🌐 **URL-based API testing** - Test live APIs and generate schemas from responses
- 🔍 **OpenAPI auto-discovery** - Automatically find OpenAPI specs in your project
- 📥 **Full OpenAPI import** - Import OpenAPI v2/v3 specs from URLs or local files
- 🧪 **Interactive API tester** - Test endpoints with custom headers and parameters
- 📊 **Response analyzer** - Analyze API responses and generate JSON schemas
- 🎯 **Better header control** - Full control over HTTP headers with no unwanted defaults

### Enhanced
- `add` command now offers two modes: test live API or create manually
- `list` command auto-discovers OpenAPI files when no schemas found
- `import` command fully implemented with preview and confirmation
- Added node-fetch for better HTTP control (instead of axios)
- Improved error handling and user feedback

### Technical
- Added services layer for API testing, response analysis, and schema generation
- Support for both raw HTTP mode and fetch mode
- TypeScript types for HTTP operations
- Better separation of concerns

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