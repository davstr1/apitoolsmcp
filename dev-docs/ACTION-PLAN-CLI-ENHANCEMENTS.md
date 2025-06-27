# Action Plan: CLI Enhancements for Real-World API Testing

Based on REVIEW-CLI-ENHANCEMENTS.md, here's the step-by-step implementation plan.

## Phase 1: Add HTTP Client and Dependencies

### 1.1 Install Required Packages
- [ ] Install node-fetch: `npm install node-fetch@2`
- [ ] Install @types/node-fetch: `npm install -D @types/node-fetch`
- [ ] Install openapi-types: `npm install openapi-types`
- [ ] Install json-schema-generator: `npm install json-schema-generator`
- [ ] Consider using native https module for ultimate control

### 1.2 Update TypeScript Types
- [ ] Create src/types/http.ts
- [ ] Define HttpMethod enum
- [ ] Define HttpRequest interface
- [ ] Define HttpResponse interface
- [ ] Define ApiTestResult interface
- [ ] Add RawHttpOptions for low-level control

## Phase 2: Enhance Add Command with URL Support

### 2.1 Refactor Add Command Structure
- [ ] Rename current add.ts to add-manual.ts
- [ ] Create new add.ts as dispatcher
- [ ] Add prompt: "How would you like to add an API?"
- [ ] Option 1: "Test a live API endpoint"
- [ ] Option 2: "Create manually"
- [ ] Route to appropriate handler

### 2.2 Create URL-Based Add Flow
- [ ] Create src/cli/commands/add-from-url.ts
- [ ] Prompt for API base URL
- [ ] Parse URL to extract base and path
- [ ] Detect existing query parameters
- [ ] Store parsed components

### 2.3 Interactive Method Selection
- [ ] Show common methods (GET, POST, PUT, DELETE)
- [ ] Allow custom method input
- [ ] Default to GET for URLs with query params
- [ ] Store selected method

### 2.4 Header Configuration
- [ ] Create src/cli/utils/common-headers.ts
- [ ] Define common header presets
- [ ] Add "Authorization: Bearer" option
- [ ] Add "API-Key" option
- [ ] Add "Content-Type" options
- [ ] Allow custom header input
- [ ] Support multiple headers

### 2.5 Parameter Builder
- [ ] Create src/cli/utils/parameter-builder.ts
- [ ] Parse query string from URL
- [ ] For each parameter, prompt for:
  - [ ] Description
  - [ ] Type (string/number/boolean)
  - [ ] Required or optional
  - [ ] Example value
  - [ ] Default value
- [ ] Support adding new parameters
- [ ] Support body parameters for POST/PUT

## Phase 3: Implement Live API Testing

### 3.1 Create API Tester
- [ ] Create src/services/api-tester.ts
- [ ] Use node-fetch or native https module
- [ ] Implement executeRequest() method with full control
- [ ] Allow raw header specification (no defaults)
- [ ] Handle different HTTP methods
- [ ] Apply headers exactly as specified
- [ ] Apply parameters
- [ ] Set appropriate timeouts
- [ ] Option to disable any automatic headers

### 3.2 Execute Test Request
- [ ] Build full URL with parameters
- [ ] Set only user-specified headers (no defaults)
- [ ] Execute HTTP request with raw control
- [ ] Capture response status
- [ ] Capture all response headers
- [ ] Capture raw response body
- [ ] Measure response time
- [ ] Log exact request sent for debugging

### 3.3 Error Handling
- [ ] Handle network errors
- [ ] Handle DNS failures
- [ ] Handle timeout errors
- [ ] Handle HTTP error codes
- [ ] Display user-friendly messages
- [ ] Ask to retry or modify

### 3.4 Response Analysis
- [ ] Create src/services/response-analyzer.ts
- [ ] Detect content type
- [ ] Parse JSON responses
- [ ] Handle XML responses
- [ ] Handle HTML responses
- [ ] Handle plain text
- [ ] Extract structure

## Phase 4: Schema Generation from Response

### 4.1 JSON Schema Inference
- [ ] Create src/services/schema-generator.ts
- [ ] Analyze JSON structure
- [ ] Infer types from values
- [ ] Detect arrays vs objects
- [ ] Identify required fields
- [ ] Generate JSON schema

### 4.2 Convert to API Schema
- [ ] Map response schema to APISchema format
- [ ] Include detected parameters
- [ ] Add response examples
- [ ] Set proper content types
- [ ] Include test metadata

### 4.3 Generate YAML
- [ ] Convert APISchema to YAML
- [ ] Include all discovered info
- [ ] Add test timestamp
- [ ] Add example request/response
- [ ] Format nicely

### 4.4 Save and Confirm
- [ ] Show generated YAML preview
- [ ] Ask for confirmation
- [ ] Allow editing before save
- [ ] Save to schema directory
- [ ] Show success message

## Phase 5: Implement Auto-Discovery

### 5.1 Create OpenAPI Scanner
- [ ] Create src/services/openapi-scanner.ts
- [ ] Define common locations to scan
- [ ] Add .openapi/ directory
- [ ] Add docs/ directory
- [ ] Add swagger.json locations
- [ ] Add openapi.yaml locations

### 5.2 Scan Implementation
- [ ] Recursively scan directories
- [ ] Look for .json files
- [ ] Look for .yaml/.yml files
- [ ] Check for OpenAPI markers
- [ ] Validate against OpenAPI schema

### 5.3 Import Found Specs
- [ ] Create src/services/openapi-importer.ts
- [ ] Parse OpenAPI v3 specs
- [ ] Parse OpenAPI v2 (Swagger) specs
- [ ] Convert to internal format
- [ ] Handle $ref resolution
- [ ] Extract all endpoints

### 5.4 Interactive Import
- [ ] Show found OpenAPI files
- [ ] Display summary of each
- [ ] Allow selection to import
- [ ] Show import preview
- [ ] Save to schema directory

## Phase 6: Enhance List Command

### 6.1 Add Metadata Tracking
- [ ] Update APISchema type
- [ ] Add source field (manual/tested/imported)
- [ ] Add createdAt timestamp
- [ ] Add lastTestedAt timestamp
- [ ] Add testResults array

### 6.2 Enhanced Display
- [ ] Show source icon/label
- [ ] Show last tested date
- [ ] Show test success rate
- [ ] Color code by status
- [ ] Add example column

### 6.3 Quick Test Feature
- [ ] Add --test flag to list command
- [ ] Allow selecting API to test
- [ ] Run quick test with defaults
- [ ] Show test results
- [ ] Update lastTestedAt

## Phase 7: Integration and Testing

### 7.1 Update MCP Server
- [ ] Ensure new schemas work with MCP
- [ ] Test all three tools
- [ ] Verify enhanced metadata
- [ ] Test with Claude Desktop

### 7.2 Create Integration Tests
- [ ] Test URL-based creation
- [ ] Test API execution
- [ ] Test schema generation
- [ ] Test discovery
- [ ] Test import

### 7.3 Update Documentation
- [ ] Update CLI commands docs
- [ ] Add examples for URL-based add
- [ ] Document discovery feature
- [ ] Add troubleshooting

### 7.4 Error Recovery
- [ ] Add retry mechanisms
- [ ] Save partial progress
- [ ] Resume interrupted adds
- [ ] Better error messages

## Phase 8: Polish and Examples

### 8.1 Add Example APIs
- [ ] Create examples/ directory
- [ ] Add GitHub API example
- [ ] Add weather API example
- [ ] Add JSON placeholder example
- [ ] Include test commands

### 8.2 Improve UX
- [ ] Add progress indicators
- [ ] Add colored output
- [ ] Add emoji indicators
- [ ] Improve prompts
- [ ] Add shortcuts

### 8.3 Add Batch Operations
- [ ] Test all APIs command
- [ ] Bulk import command
- [ ] Export all schemas
- [ ] Backup/restore

## Completion Checklist
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Examples working
- [ ] Live API testing functional
- [ ] Auto-discovery working
- [ ] Enhanced CLI experience complete