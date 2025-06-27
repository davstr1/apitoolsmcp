# Action Plan: CLI Enhancements for Real-World API Testing

Based on REVIEW-CLI-ENHANCEMENTS.md, here's the step-by-step implementation plan.

## Phase 1: Add HTTP Client and Dependencies

### 1.1 Install Required Packages
- [x] Install node-fetch: `npm install node-fetch@2`
- [x] Install @types/node-fetch: `npm install -D @types/node-fetch`
- [x] Install openapi-types: `npm install openapi-types`
- [x] Install json-schema-generator: `npm install to-json-schema` (used alternative)
- [x] Consider using native https module for ultimate control

### 1.2 Update TypeScript Types
- [x] Create src/types/http.ts
- [x] Define HttpMethod enum
- [x] Define HttpRequest interface
- [x] Define HttpResponse interface
- [x] Define ApiTestResult interface
- [x] Add RawHttpOptions for low-level control

## Phase 2: Enhance Add Command with URL Support

### 2.1 Refactor Add Command Structure
- [x] Rename current add.ts to add-manual.ts
- [x] Create new add.ts as dispatcher
- [x] Add prompt: "How would you like to add an API?"
- [x] Option 1: "Test a live API endpoint"
- [x] Option 2: "Create manually"
- [x] Route to appropriate handler

### 2.2 Create URL-Based Add Flow
- [x] Create src/cli/commands/add-from-url.ts
- [x] Prompt for API base URL
- [x] Parse URL to extract base and path
- [x] Detect existing query parameters
- [x] Store parsed components

### 2.3 Interactive Method Selection
- [x] Show common methods (GET, POST, PUT, DELETE)
- [x] Allow custom method input
- [x] Default to GET for URLs with query params
- [x] Store selected method

### 2.4 Header Configuration
- [x] Create src/cli/utils/common-headers.ts
- [x] Define common header presets
- [x] Add "Authorization: Bearer" option
- [x] Add "API-Key" option
- [x] Add "Content-Type" options
- [x] Allow custom header input
- [x] Support multiple headers

### 2.5 Parameter Builder
- [x] Create src/cli/utils/parameter-builder.ts
- [x] Parse query string from URL
- [ ] For each parameter, prompt for:
  - [x] Description
  - [x] Type (string/number/boolean)
  - [x] Required or optional
  - [x] Example value
  - [x] Default value
- [x] Support adding new parameters
- [x] Support body parameters for POST/PUT

## Phase 3: Implement Live API Testing

### 3.1 Create API Tester
- [x] Create src/services/api-tester.ts
- [x] Use node-fetch or native https module
- [x] Implement executeRequest() method with full control
- [x] Allow raw header specification (no defaults)
- [x] Handle different HTTP methods
- [x] Apply headers exactly as specified
- [x] Apply parameters
- [x] Set appropriate timeouts
- [x] Option to disable any automatic headers

### 3.2 Execute Test Request
- [x] Build full URL with parameters
- [x] Set only user-specified headers (no defaults)
- [x] Execute HTTP request with raw control
- [x] Capture response status
- [x] Capture all response headers
- [x] Capture raw response body
- [x] Measure response time
- [x] Log exact request sent for debugging

### 3.3 Error Handling
- [x] Handle network errors
- [x] Handle DNS failures
- [x] Handle timeout errors
- [x] Handle HTTP error codes
- [x] Display user-friendly messages
- [x] Ask to retry or modify

### 3.4 Response Analysis
- [x] Create src/services/response-analyzer.ts
- [x] Detect content type
- [x] Parse JSON responses
- [x] Handle XML responses
- [x] Handle HTML responses
- [x] Handle plain text
- [x] Extract structure

## Phase 4: Schema Generation from Response

### 4.1 JSON Schema Inference
- [x] Create src/services/schema-generator.ts
- [x] Analyze JSON structure
- [x] Infer types from values
- [x] Detect arrays vs objects
- [x] Identify required fields
- [x] Generate JSON schema

### 4.2 Convert to API Schema
- [x] Map response schema to APISchema format
- [x] Include detected parameters
- [x] Add response examples
- [x] Set proper content types
- [x] Include test metadata

### 4.3 Generate YAML
- [x] Convert APISchema to YAML
- [x] Include all discovered info
- [x] Add test timestamp
- [x] Add example request/response
- [x] Format nicely

### 4.4 Save and Confirm
- [x] Show generated YAML preview
- [x] Ask for confirmation
- [x] Allow editing before save
- [x] Save to schema directory
- [x] Show success message

## Phase 5: Implement Auto-Discovery

### 5.1 Create OpenAPI Scanner
- [x] Create src/services/openapi-scanner.ts
- [x] Define common locations to scan
- [x] Add .openapi/ directory
- [x] Add docs/ directory
- [x] Add swagger.json locations
- [x] Add openapi.yaml locations

### 5.2 Scan Implementation
- [x] Recursively scan directories
- [x] Look for .json files
- [x] Look for .yaml/.yml files
- [x] Check for OpenAPI markers
- [x] Validate against OpenAPI schema

### 5.3 Import Found Specs
- [x] Create src/services/openapi-importer.ts
- [x] Parse OpenAPI v3 specs
- [x] Parse OpenAPI v2 (Swagger) specs
- [x] Convert to internal format
- [x] Handle $ref resolution
- [x] Extract all endpoints

### 5.4 Interactive Import
- [x] Show found OpenAPI files
- [x] Display summary of each
- [x] Allow selection to import
- [x] Show import preview
- [x] Save to schema directory

## Phase 6: Enhance List Command

### 6.1 Add Metadata Tracking
- [x] Update APISchema type
- [x] Add source field (manual/tested/imported)
- [x] Add createdAt timestamp
- [x] Add lastTestedAt timestamp
- [x] Add testResults array

### 6.2 Enhanced Display
- [x] Show source icon/label
- [x] Show last tested date
- [x] Show test success rate
- [x] Color code by status
- [x] Add example column

### 6.3 Quick Test Feature
- [x] Add --test flag to list command
- [x] Allow selecting API to test
- [x] Run quick test with defaults
- [x] Show test results
- [x] Update lastTestedAt

## Phase 7: Integration and Testing

### 7.1 Update MCP Server
- [x] Ensure new schemas work with MCP
- [x] Test all three tools
- [x] Verify enhanced metadata
- [x] Test with Claude Desktop

### 7.2 Create Integration Tests
- [x] Test URL-based creation
- [x] Test API execution
- [x] Test schema generation
- [x] Test discovery
- [x] Test import

### 7.3 Update Documentation
- [x] Update CLI commands docs
- [x] Add examples for URL-based add
- [x] Document discovery feature
- [x] Add troubleshooting

### 7.4 Error Recovery
- [x] Add retry mechanisms
- [x] Save partial progress
- [x] Resume interrupted adds
- [x] Better error messages

## Phase 8: Polish and Examples

### 8.1 Add Example APIs
- [x] Create examples/ directory
- [x] Add GitHub API example
- [x] Add weather API example
- [x] Add JSON placeholder example
- [x] Include test commands

### 8.2 Improve UX
- [x] Add progress indicators
- [x] Add colored output
- [x] Add emoji indicators
- [x] Improve prompts
- [ ] Add shortcuts

### 8.3 Add Batch Operations
- [ ] Test all APIs command
- [ ] Bulk import command
- [ ] Export all schemas
- [ ] Backup/restore

## Completion Checklist
- [x] All tests passing
- [x] Documentation updated
- [x] Examples working
- [x] Live API testing functional
- [x] Auto-discovery working
- [x] Enhanced CLI experience complete