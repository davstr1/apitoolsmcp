# Changelog

All notable changes to this project will be documented in this file.

## [0.3.0] - 2024-01-10

### Added
- 🌐 **Live API Testing**: Test real API endpoints and generate schemas from responses
- 🔍 **Auto-Discovery**: Automatically find OpenAPI specifications in your project
- 📊 **Enhanced Metadata**: Track creation dates, test history, and success rates
- 🧪 **Quick Test Feature**: Test APIs directly from the list command with `--test` flag
- 📋 **Interactive Parameter Builder**: Build API parameters from URL query strings
- 🎯 **Full HTTP Control**: Use node-fetch or native HTTP for complete header control
- 📝 **Response Analysis**: Analyze API responses and generate JSON schemas
- 📥 **Smart Import**: Import OpenAPI v2/v3 specs with metadata preservation
- 🎨 **Enhanced Display**: Color-coded status, source icons, and test results
- 📚 **Example APIs**: Added GitHub, Weather, and JSONPlaceholder examples

### Changed
- Refactored `add` command to support both manual and URL-based creation
- Improved schema validation with better error messages
- Updated all schemas to include comprehensive metadata
- Enhanced list command output with rich information display

### Fixed
- Header injection issues with axios (switched to node-fetch)
- TypeScript compilation errors with OpenAPI types
- Response handling for various content types

## [0.2.0] - 2024-01-09

### Added
- Import OpenAPI specifications from URL or local file
- Schema validation with detailed error reports
- Search functionality in list command

### Changed
- Improved error handling across all commands
- Better CLI user experience with colored output

## [0.1.0] - 2024-01-08

### Added
- Initial release
- Basic CLI for managing API schemas
- MCP server implementation
- YAML schema format support
- Add, edit, list, and validate commands