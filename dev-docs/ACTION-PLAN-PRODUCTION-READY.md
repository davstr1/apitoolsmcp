# Action Plan: Production Readiness

Based on REVIEW-PRODUCTION-READY.md, here's the step-by-step plan to make this codebase production-ready.

## Phase 1: Critical Test Coverage (Highest Priority)

### 1.1 Setup Test Infrastructure
- [ ] Add test coverage reporting to jest.config.js
- [ ] Configure coverage thresholds (target 80%)
- [ ] Add coverage badges to README
- [ ] Setup GitHub Actions for CI/CD with test runs

### 1.2 Test CLI Commands
- [ ] Create tests/cli/commands/add.test.ts
  - [ ] Test manual mode flow
  - [ ] Test URL-based mode flow
  - [ ] Test parameter validation
  - [ ] Test error scenarios
- [ ] Create tests/cli/commands/add-manual.test.ts
  - [ ] Test interactive prompts
  - [ ] Test schema creation
  - [ ] Test file writing
- [ ] Create tests/cli/commands/add-from-url.test.ts
  - [ ] Test URL parsing
  - [ ] Test API testing flow
  - [ ] Test schema generation
  - [ ] Mock HTTP requests
- [ ] Create tests/cli/commands/list.test.ts
  - [ ] Test basic listing
  - [ ] Test search functionality
  - [ ] Test --test flag
  - [ ] Test empty directory handling
- [ ] Create tests/cli/commands/edit.test.ts
  - [ ] Test editing existing schemas
  - [ ] Test validation on save
- [ ] Create tests/cli/commands/validate.test.ts
  - [ ] Test single file validation
  - [ ] Test directory validation
  - [ ] Test error reporting
- [ ] Create tests/cli/commands/import.test.ts
  - [ ] Test OpenAPI v2 import
  - [ ] Test OpenAPI v3 import
  - [ ] Test URL imports
  - [ ] Test local file imports

### 1.3 Test Services
- [ ] Create tests/services/api-tester.test.ts
  - [ ] Test HTTP request execution
  - [ ] Test different HTTP methods
  - [ ] Test error handling
  - [ ] Test timeout scenarios
- [ ] Create tests/services/response-analyzer.test.ts
  - [ ] Test JSON analysis
  - [ ] Test XML analysis
  - [ ] Test HTML analysis
  - [ ] Test content type detection
- [ ] Create tests/services/schema-generator.test.ts
  - [ ] Test schema generation from response
  - [ ] Test basic schema generation
  - [ ] Test metadata inclusion
- [ ] Create tests/services/openapi-scanner.test.ts
  - [ ] Test directory scanning
  - [ ] Test file detection
  - [ ] Test OpenAPI validation
- [ ] Create tests/services/openapi-importer.test.ts
  - [ ] Test v2 conversion
  - [ ] Test v3 conversion
  - [ ] Test authentication extraction

### 1.4 Test Server Components
- [ ] Create tests/server/index.test.ts
  - [ ] Test MCP server initialization
  - [ ] Test tool handlers
  - [ ] Test error handling
- [ ] Create tests/server/schema-provider.test.ts
  - [ ] Test schema loading
  - [ ] Test search functionality
  - [ ] Test caching

### 1.5 Integration Tests
- [ ] Create tests/integration/cli-workflow.test.ts
  - [ ] Test complete add->list->test workflow
  - [ ] Test import->validate workflow
- [ ] Create tests/integration/mcp-server.test.ts
  - [ ] Test MCP protocol compliance
  - [ ] Test all three tools end-to-end

## Phase 2: Replace Console Logging

### 2.1 Setup Logging Infrastructure
- [ ] Install winston or pino
- [ ] Create src/utils/logger.ts
- [ ] Configure log levels (debug, info, warn, error)
- [ ] Setup file and console transports
- [ ] Add structured logging format

### 2.2 Replace Console Statements
- [ ] Replace console.log in CLI commands with logger
  - [ ] Maintain user-friendly output for CLI
  - [ ] Add --verbose flag for debug logs
- [ ] Replace console.error with logger.error
- [ ] Add request ID tracking for debugging
- [ ] Add performance logging

### 2.3 CLI Output Abstraction
- [ ] Create src/cli/utils/output.ts
- [ ] Implement success(), error(), info() methods
- [ ] Maintain chalk coloring
- [ ] Add --json flag for structured output

## Phase 3: Update Dependencies

### 3.1 Major Updates
- [ ] Update chalk from v4 to v5
  - [ ] Review breaking changes
  - [ ] Update import statements
- [ ] Update inquirer from v8 to v12
  - [ ] Review breaking changes
  - [ ] Test all prompts
- [ ] Update node-fetch from v2 to v3
  - [ ] Convert to ESM imports
  - [ ] Update TypeScript types

### 3.2 Security Audit
- [ ] Run npm audit
- [ ] Fix all vulnerabilities
- [ ] Setup Dependabot
- [ ] Add security policy

## Phase 4: Development Tooling

### 4.1 Linting Setup
- [ ] Install ESLint
- [ ] Create .eslintrc.js with TypeScript rules
- [ ] Add npm run lint script
- [ ] Fix all linting errors
- [ ] Setup eslint-plugin-security

### 4.2 Formatting Setup
- [ ] Install Prettier
- [ ] Create .prettierrc
- [ ] Add npm run format script
- [ ] Format all files
- [ ] Setup format on save

### 4.3 Pre-commit Hooks
- [ ] Install husky
- [ ] Install lint-staged
- [ ] Setup pre-commit hook for:
  - [ ] ESLint
  - [ ] Prettier
  - [ ] TypeScript check
  - [ ] Unit tests
- [ ] Add commit message linting

### 4.4 CI/CD Pipeline
- [ ] Create .github/workflows/ci.yml
- [ ] Run tests on all PRs
- [ ] Run linting and formatting checks
- [ ] Build TypeScript
- [ ] Upload coverage reports

## Phase 5: Error Handling Standards

### 5.1 Custom Error Classes
- [ ] Create src/errors/base-error.ts
- [ ] Create specific error types:
  - [ ] ValidationError
  - [ ] NetworkError
  - [ ] ConfigurationError
  - [ ] NotFoundError
- [ ] Add error codes
- [ ] Add serialization methods

### 5.2 Error Middleware
- [ ] Create centralized error handler
- [ ] Standardize error responses
- [ ] Add error tracking
- [ ] Implement retry logic for network errors

### 5.3 Input Validation
- [ ] Add zod schemas for all inputs
- [ ] Validate at boundaries
- [ ] Provide helpful error messages
- [ ] Add type guards

## Phase 6: Production Features

### 6.1 Health Monitoring
- [ ] Add health check endpoint to MCP server
- [ ] Add readiness check
- [ ] Add metrics collection
- [ ] Setup monitoring alerts

### 6.2 Configuration Management
- [ ] Validate config on startup
- [ ] Add config schema
- [ ] Support environment-based config
- [ ] Add config hot-reloading

### 6.3 Performance
- [ ] Add request caching
- [ ] Implement connection pooling
- [ ] Add rate limiting for API testing
- [ ] Optimize schema loading

### 6.4 Documentation
- [ ] Generate API documentation
- [ ] Add JSDoc comments
- [ ] Create architecture docs
- [ ] Add troubleshooting guide

## Completion Checklist

- [ ] Test coverage > 80%
- [ ] All console.log replaced
- [ ] Dependencies updated
- [ ] Zero security vulnerabilities
- [ ] ESLint passing
- [ ] Prettier applied
- [ ] Pre-commit hooks working
- [ ] CI/CD pipeline green
- [ ] Error handling standardized
- [ ] Health checks implemented
- [ ] Documentation complete
- [ ] Performance optimized

## Success Metrics

- Test coverage: 80%+ (currently 9.09%)
- Build time: < 30 seconds
- Zero security vulnerabilities
- Zero TypeScript errors
- Zero ESLint errors
- All dependencies up to date