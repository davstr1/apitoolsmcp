# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0-rc1] - 2025-06-27

### Added
- 🛡️ **Production Resilience Features**:
  - Retry logic with exponential backoff
  - Circuit breaker pattern implementation
  - Rate limiting with token bucket algorithm
  - Graceful shutdown handling with active request tracking
- 📊 **Monitoring & Observability**:
  - Health check endpoints (/health, /health/live, /health/ready)
  - Prometheus metrics exposure on port 9090
  - Request/error/latency tracking
  - Performance metrics collection
- 🔒 **Security Enhancements**:
  - Comprehensive input validation
  - Rate limiting per API
  - Security review documentation
  - No vulnerabilities in dependencies
- 📚 **Production Documentation**:
  - Troubleshooting guide
  - Security best practices
  - Performance optimization guide
  - Production checklist
- 🧪 **Enhanced Testing**:
  - E2E tests for full workflows
  - Integration tests with real services
  - Edge case tests for network failures
  - Pre-commit hooks running tests

### Changed
- Improved response analyzer to handle all content types properly
- Enhanced error categorization and handling
- Updated dependencies to latest secure versions
- Refactored for better TypeScript strict mode compliance

### Fixed
- Response analyzer structure property for non-JSON responses
- Content-type parsing to handle charset parameters
- TypeScript type errors in various modules
- ESLint configuration for security plugin
- Circuit breaker state management

### Security
- No vulnerabilities found in dependencies (npm audit clean)
- No hardcoded secrets or API keys
- Proper error message sanitization
- Input validation on all endpoints

### Known Issues
- ⚠️ **Test coverage is critically low at 9.09%** (target: 90%+)
- Load testing not yet completed
- Distributed tracing not implemented
- Alert rules not yet defined

### Note
This is a release candidate. While all production features are implemented, the low test coverage (9.09%) makes this unsuitable for production deployment. Significant testing improvements are required before v1.0.0 release.

**Production Readiness Score: 75%** (down from target 95% due to test coverage)

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