# Action Plan: API Tools MCP Server MVP

Based on REVIEW-MVP-INITIAL.md, here's the step-by-step implementation plan.

## Phase 1: Project Foundation

### 1.1 Initialize NPM Project
- [ ] Run `npm init -y` to create package.json
- [ ] Set package name to `api-tools-mcp`
- [ ] Add description: "MCP server for serving API schemas to AI"
- [ ] Set version to 0.1.0
- [ ] Add author and license (MIT)

### 1.2 Configure TypeScript
- [ ] Install TypeScript: `npm install -D typescript @types/node`
- [ ] Create tsconfig.json with strict mode
- [ ] Set target to ES2020
- [ ] Set module to commonjs
- [ ] Configure outDir to dist/

### 1.3 Setup Build System
- [ ] Add build script to package.json: `"build": "tsc"`
- [ ] Add watch script: `"dev": "tsc --watch"`
- [ ] Add clean script: `"clean": "rm -rf dist"`
- [ ] Install rimraf for cross-platform clean: `npm install -D rimraf`
- [ ] Update clean script to use rimraf

### 1.4 Configure Testing
- [ ] Install Jest: `npm install -D jest @types/jest ts-jest`
- [ ] Create jest.config.js
- [ ] Configure ts-jest preset
- [ ] Add test script to package.json
- [ ] Add test:watch script

### 1.5 Setup Git Configuration
- [ ] Create .gitignore file
- [ ] Add node_modules/
- [ ] Add dist/
- [ ] Add .env
- [ ] Add coverage/
- [ ] Add *.log

### 1.6 Configure NPM Package
- [ ] Add "main" field pointing to dist/index.js
- [ ] Add "types" field pointing to dist/index.d.ts
- [ ] Add "bin" field for CLI: `"api-tools-mcp": "./dist/cli/index.js"`
- [ ] Add "files" field to include only dist/
- [ ] Add "prepublishOnly" script: `"npm run build"`

## Phase 2: Core Structure

### 2.1 Create Directory Structure
- [ ] Create src/ directory
- [ ] Create src/types/ for TypeScript interfaces
- [ ] Create src/server/ for MCP server
- [ ] Create src/cli/ for CLI implementation
- [ ] Create src/utils/ for utilities
- [ ] Create src/schemas/ for schema handling

### 2.2 Define Core Types
- [ ] Create src/types/api-schema.ts
- [ ] Define APISchema interface
- [ ] Define APIEndpoint interface
- [ ] Define APIParameter interface
- [ ] Define APIHeader interface
- [ ] Define HTTPMethod enum

### 2.3 Create Configuration Types
- [ ] Create src/types/config.ts
- [ ] Define Config interface
- [ ] Add schemaDirectory property
- [ ] Add remoteImports property
- [ ] Add watchMode property

## Phase 3: MCP Server Core

### 3.1 Install MCP Dependencies
- [ ] Install @modelcontextprotocol/sdk
- [ ] Install any required MCP types

### 3.2 Create MCP Server Base
- [ ] Create src/server/index.ts
- [ ] Import MCP SDK
- [ ] Create MCPServer class
- [ ] Implement constructor
- [ ] Add start() method
- [ ] Add stop() method

### 3.3 Implement Schema Provider
- [ ] Create src/server/schema-provider.ts
- [ ] Create SchemaProvider class
- [ ] Add loadSchemas() method
- [ ] Add getSchema() method
- [ ] Add listSchemas() method

### 3.4 Create MCP Tools
- [ ] Create src/server/tools.ts
- [ ] Define getAPISchema tool
- [ ] Define listAPIs tool
- [ ] Define getEndpoint tool
- [ ] Register tools with MCP server

## Phase 4: Schema Management

### 4.1 Install YAML Dependencies
- [ ] Install js-yaml: `npm install js-yaml`
- [ ] Install @types/js-yaml: `npm install -D @types/js-yaml`

### 4.2 Create YAML Scanner
- [ ] Create src/schemas/yaml-scanner.ts
- [ ] Implement scanDirectory() method
- [ ] Add file filtering for .yaml/.yml
- [ ] Implement recursive directory scanning
- [ ] Add error handling for invalid files

### 4.3 Create Schema Parser
- [ ] Create src/schemas/parser.ts
- [ ] Implement parseYAMLFile() method
- [ ] Add schema validation
- [ ] Convert to internal format
- [ ] Add error collection

### 4.4 Create Schema Validator
- [ ] Create src/schemas/validator.ts
- [ ] Install ajv for JSON schema validation
- [ ] Define validation schema
- [ ] Implement validate() method
- [ ] Add detailed error reporting

## Phase 5: CLI Implementation

### 5.1 Install CLI Dependencies
- [ ] Install commander: `npm install commander`
- [ ] Install chalk for colors: `npm install chalk@4`
- [ ] Install inquirer for prompts: `npm install inquirer@8`
- [ ] Install types for inquirer

### 5.2 Create CLI Entry Point
- [ ] Create src/cli/index.ts
- [ ] Add shebang: `#!/usr/bin/env node`
- [ ] Import commander
- [ ] Setup program metadata
- [ ] Define commands structure

### 5.3 Implement Add Command
- [ ] Create src/cli/commands/add.ts
- [ ] Create interactive prompts for API details
- [ ] Generate YAML from responses
- [ ] Write to configured directory
- [ ] Validate before saving

### 5.4 Implement Edit Command
- [ ] Create src/cli/commands/edit.ts
- [ ] List available APIs
- [ ] Load selected API
- [ ] Show current values in prompts
- [ ] Save updated YAML

### 5.5 Implement List Command
- [ ] Create src/cli/commands/list.ts
- [ ] Scan configured directory
- [ ] Display API summaries
- [ ] Add filtering options
- [ ] Format output nicely

### 5.6 Implement Validate Command
- [ ] Create src/cli/commands/validate.ts
- [ ] Validate single file or directory
- [ ] Show validation errors
- [ ] Exit with appropriate code

## Phase 6: OpenAPI Integration

### 6.1 Install OpenAPI Dependencies
- [ ] Install openapi-types
- [ ] Install node-fetch for HTTP requests
- [ ] Install @types/node-fetch

### 6.2 Create OpenAPI Parser
- [ ] Create src/schemas/openapi-parser.ts
- [ ] Implement parseOpenAPISpec() method
- [ ] Convert OpenAPI to internal format
- [ ] Handle different OpenAPI versions
- [ ] Extract all endpoints

### 6.3 Add Remote Import
- [ ] Create src/schemas/remote-importer.ts
- [ ] Implement fetchRemoteSpec() method
- [ ] Add HTTP error handling
- [ ] Cache downloaded specs
- [ ] Add timeout handling

### 6.4 Add Import Command to CLI
- [ ] Create src/cli/commands/import.ts
- [ ] Accept URL parameter
- [ ] Fetch and parse OpenAPI
- [ ] Convert to YAML
- [ ] Save to configured directory

## Phase 7: Configuration Management

### 7.1 Create Config Loader
- [ ] Create src/config/loader.ts
- [ ] Check environment variables
- [ ] Look for config file
- [ ] Implement defaults
- [ ] Merge configurations

### 7.2 Add Config File Support
- [ ] Support .apitoolsmcp.json
- [ ] Support .apitoolsmcp.yaml
- [ ] Check in project root
- [ ] Check in home directory
- [ ] Document config format

### 7.3 Environment Variables
- [ ] Define APITOOLSMCP_SCHEMA_DIR
- [ ] Define APITOOLSMCP_CONFIG_PATH
- [ ] Document all env vars
- [ ] Add to config loader

## Phase 8: Testing

### 8.1 Unit Tests - Schema Parser
- [ ] Create tests/schemas/parser.test.ts
- [ ] Test valid YAML parsing
- [ ] Test invalid YAML handling
- [ ] Test schema conversion
- [ ] Test edge cases

### 8.2 Unit Tests - MCP Server
- [ ] Create tests/server/index.test.ts
- [ ] Test server initialization
- [ ] Test tool registration
- [ ] Test schema loading
- [ ] Mock MCP SDK

### 8.3 Integration Tests - CLI
- [ ] Create tests/cli/integration.test.ts
- [ ] Test add command
- [ ] Test edit command
- [ ] Test list command
- [ ] Test file operations

### 8.4 Integration Tests - OpenAPI
- [ ] Create tests/schemas/openapi.test.ts
- [ ] Test OpenAPI v3 parsing
- [ ] Test OpenAPI v2 parsing
- [ ] Test remote fetching
- [ ] Use mock HTTP server

## Phase 9: Developer Testing Setup

### 9.1 Create Test Example Project
- [ ] Create test-example/ directory
- [ ] Add .gitignore for node_modules
- [ ] Create package.json
- [ ] Add local dependency to main package

### 9.2 Add Sample API Schemas
- [ ] Create test-example/schemas/ directory
- [ ] Add sample-rest-api.yaml
- [ ] Add sample-graphql-api.yaml
- [ ] Add sample-webhook-api.yaml
- [ ] Include various parameter types

### 9.3 Create Test Scripts
- [ ] Create test-example/test-cli.js
- [ ] Create test-example/test-server.js
- [ ] Add npm scripts for testing
- [ ] Document usage

### 9.4 Setup NPM Link
- [ ] Add link script to main package.json
- [ ] Add link:test script
- [ ] Create setup-dev.sh script
- [ ] Document development workflow

### 9.5 Claude Desktop Integration
- [ ] Create test-example/claude-config.json
- [ ] Add MCP server configuration
- [ ] Document setup process
- [ ] Add troubleshooting guide

## Phase 10: Documentation

### 10.1 Create README
- [ ] Add project description
- [ ] Add installation instructions
- [ ] Add quick start guide
- [ ] Add CLI usage examples
- [ ] Add configuration section

### 10.2 API Schema Documentation
- [ ] Create docs/schema-format.md
- [ ] Document YAML structure
- [ ] Provide examples
- [ ] Explain all fields
- [ ] Add best practices

### 10.3 CLI Documentation
- [ ] Create docs/cli-commands.md
- [ ] Document each command
- [ ] Add usage examples
- [ ] Include options
- [ ] Add troubleshooting

### 10.4 MCP Integration Guide
- [ ] Create docs/mcp-integration.md
- [ ] Explain MCP tools
- [ ] Show AI usage examples
- [ ] Document capabilities
- [ ] Add Claude Desktop setup

## Phase 11: Pre-Release

### 11.1 Add License
- [ ] Create LICENSE file
- [ ] Use MIT license
- [ ] Update package.json

### 11.2 Setup CI/CD
- [ ] Create .github/workflows/
- [ ] Add test workflow
- [ ] Add build workflow
- [ ] Add npm publish workflow

### 11.3 Final Testing
- [ ] Run full test suite
- [ ] Test npm pack
- [ ] Test local install
- [ ] Test global install
- [ ] Verify CLI works

### 11.4 Prepare for Publishing
- [ ] Update version to 1.0.0
- [ ] Write CHANGELOG.md
- [ ] Review all documentation
- [ ] Test one more time
- [ ] Run npm publish --dry-run

## Completion Checklist
- [ ] All tests passing
- [ ] Documentation complete
- [ ] Example project working
- [ ] CLI commands functional
- [ ] MCP server operational
- [ ] Ready for npm publish