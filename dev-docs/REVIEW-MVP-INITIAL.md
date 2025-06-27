# MVP Review: API Tools MCP Server - Initial State

## Current State Assessment

### What Exists:
- **CLAUDE.md**: Project instructions and development commands
- **instructions.md**: Core requirements specification

### What's Missing (Everything):
- No actual codebase implementation
- No package.json or npm setup
- No TypeScript/Node.js structure
- No MCP server implementation
- No CLI implementation
- No tests
- No build configuration

## Requirements Analysis from instructions.md

### Core Requirements:
1. **MCP Server** that provides AI with API structures including:
   - Full URLs
   - Required headers
   - Result formats
   - Arguments/parameters (types, mandatory/optional)
   - HTTP methods (GET/POST)

2. **Data Sources**:
   - YAML config files from a configurable directory
   - Remote OpenAPI specs via HTTP import

3. **CLI for Humans** to:
   - Add new API schemas
   - Edit existing API schemas

4. **NPM Module** with:
   - Configurable directory support
   - Multi-workspace compatibility (frontend/backend)

5. **Integration Requirements**:
   - Use Context7 MCP for latest library versions
   - OpenAPI specification support

## MVP Implementation Checklist

### 1. Project Setup ✗
- [ ] Initialize npm project with package.json
- [ ] Configure TypeScript
- [ ] Setup build scripts
- [ ] Configure Jest for testing
- [ ] Add .gitignore
- [ ] Setup pre-commit hooks

### 2. Core Structure ✗
- [ ] Create src/ directory structure
- [ ] Define TypeScript interfaces for API schemas
- [ ] Create YAML schema definitions
- [ ] Setup configuration management

### 3. MCP Server Implementation ✗
- [ ] Implement MCP server base
- [ ] Create API schema provider
- [ ] Implement YAML file scanner
- [ ] Add schema validation
- [ ] Create MCP tool definitions

### 4. CLI Implementation ✗
- [ ] Create CLI entry point
- [ ] Implement 'add' command for new APIs
- [ ] Implement 'edit' command for existing APIs
- [ ] Add 'list' command to show available APIs
- [ ] Add 'validate' command for schemas

### 5. OpenAPI Integration ✗
- [ ] Add OpenAPI spec parser
- [ ] Implement remote URL fetching
- [ ] Convert OpenAPI to internal schema format
- [ ] Add import command to CLI

### 6. Configuration Management ✗
- [ ] Support configurable directories
- [ ] Handle multi-workspace scenarios
- [ ] Environment variable support
- [ ] Default config locations

### 7. Testing ✗
- [ ] Unit tests for schema parsing
- [ ] Integration tests for MCP server
- [ ] CLI command tests
- [ ] OpenAPI import tests

### 8. Documentation ✗
- [ ] README with install/usage instructions
- [ ] API schema format documentation
- [ ] CLI command documentation
- [ ] MCP integration guide

## Priority Actions for MVP

1. **Initialize Project** - Create package.json, TypeScript config
2. **Define Schema Format** - Create TypeScript interfaces for API definitions
3. **Build MCP Server Core** - Basic server that can read and serve schemas
4. **Implement YAML Scanner** - Read YAML files from configured directory
5. **Create Basic CLI** - Add/edit/list commands
6. **Add Tests** - Basic coverage for core functionality

## Technical Considerations

- **MCP Protocol**: Need to implement proper MCP server following the protocol spec
- **Schema Format**: Should align with OpenAPI but be simpler for manual editing
- **File Watching**: Consider watching YAML directory for changes
- **Validation**: Robust schema validation to prevent runtime errors
- **Error Handling**: Clear error messages for both AI and human users

## Conclusion

This is a greenfield project with zero implementation. The requirements are clear and focused on providing a bridge between API specifications (YAML/OpenAPI) and AI consumption via MCP. The MVP should focus on the core loop: read schemas → validate → serve via MCP, with a simple CLI for management.