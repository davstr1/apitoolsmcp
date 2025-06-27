# Review: CLI Enhancements Requirements

## Current Implementation vs Requirements

### What We Have Now:
1. **CLI Commands**:
   - `add` - Interactive prompts to create API schemas manually
   - `edit` - Edit existing API schemas
   - `list` - List all API schemas from YAML files
   - `validate` - Validate YAML schemas
   - `import` - Stub for OpenAPI import (not implemented)

2. **MCP Server**: 
   - Reads YAML files from configured directory
   - Serves them via MCP tools

### What's Missing (Based on INDICATIONS-CLI.md):

1. **Auto-Discovery of APIs**
   - CLI should scan the local codebase for OpenAPI config files
   - Should detect existing API definitions automatically
   - If none found, should prompt to add one

2. **Interactive API Builder from URL**
   - Accept a base URL (like `https://api.wallapop.com/api/v3/search?`)
   - Interactively ask for:
     - HTTP method (GET/POST)
     - Required headers
     - Available parameters
     - Example parameter values

3. **Live API Testing**
   - Actually execute a test query with the provided info
   - Analyze the response to deduce the format
   - Generate OpenAPI YAML from the response

4. **Automatic Integration**
   - Save generated YAML to the schemas directory
   - Make it immediately available to MCP server
   - Both CLI and MCP should detect and use it

## MVP Enhancement Checklist

### Phase 1: Enhanced Add Command ✗
- [ ] Refactor `add` command to support URL-based creation
- [ ] Add prompts for base URL input
- [ ] Detect if URL has query params and parse them
- [ ] Interactive method selection (GET/POST/etc)
- [ ] Header configuration with common presets
- [ ] Parameter builder with types and examples

### Phase 2: Live API Testing ✗
- [ ] Install axios or node-fetch for HTTP requests
- [ ] Add test execution with provided parameters
- [ ] Parse and analyze response structure
- [ ] Detect response content type
- [ ] Extract response schema from actual data
- [ ] Handle errors gracefully

### Phase 3: Schema Generation ✗
- [ ] Convert test results to OpenAPI format
- [ ] Generate proper response schemas
- [ ] Include discovered parameters
- [ ] Add example values from test
- [ ] Save to configured directory

### Phase 4: Auto-Discovery ✗
- [ ] Scan current directory for existing OpenAPI files
- [ ] Support common locations (.openapi/, docs/, etc.)
- [ ] Parse found OpenAPI specs
- [ ] Convert to internal format
- [ ] Prompt to import if found

### Phase 5: Enhanced List Command ✗
- [ ] Show source of each API (manual, imported, discovered)
- [ ] Display last used/tested timestamp
- [ ] Show example usage for each API
- [ ] Add quick test option

## Technical Considerations

1. **HTTP Client**: Need to add axios or node-fetch for making actual API calls
2. **OpenAPI Parser**: Need proper OpenAPI v3 parser for importing existing specs
3. **Response Analysis**: Need JSON schema inference from responses
4. **Error Handling**: Must handle network errors, auth failures, etc.
5. **Storage**: Consider storing test results and examples

## Priority Actions

1. **Start with URL-based add command** - Most valuable MVP feature
2. **Add live testing** - Validates the API works
3. **Generate from response** - Creates accurate schemas
4. **Then add discovery** - Helps with existing projects

## Conclusion

The current implementation is a solid foundation but lacks the dynamic, test-driven approach described in INDICATIONS-CLI.md. The key missing piece is the ability to discover and test real APIs, then automatically generate schemas from actual responses. This would make the tool much more practical for real-world use.