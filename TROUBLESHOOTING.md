# Troubleshooting Guide

This guide helps you resolve common issues when using API Tools MCP.

## Table of Contents

- [Installation Issues](#installation-issues)
- [Configuration Problems](#configuration-problems)
- [Network Errors](#network-errors)
- [API Testing Issues](#api-testing-issues)
- [Schema Validation Errors](#schema-validation-errors)
- [Performance Problems](#performance-problems)
- [Debugging Tips](#debugging-tips)

## Installation Issues

### Node.js Version Incompatibility

**Problem**: Installation fails with syntax errors or unsupported features.

**Solution**:
```bash
# Check your Node.js version
node --version

# Requires Node.js 18 or higher
# If outdated, update using nvm:
nvm install 18
nvm use 18
```

### Missing Dependencies

**Problem**: `MODULE_NOT_FOUND` errors when running the CLI.

**Solution**:
```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# For global installation issues
npm uninstall -g @api-tools/mcp
npm install -g @api-tools/mcp
```

### Permission Errors

**Problem**: `EACCES` or permission denied errors during installation.

**Solution**:
```bash
# Option 1: Use npx (recommended)
npx @api-tools/mcp <command>

# Option 2: Fix npm permissions
npm config set prefix ~/.npm-global
export PATH=~/.npm-global/bin:$PATH
```

## Configuration Problems

### Config File Not Found

**Problem**: `Error: Configuration file not found`

**Solution**:
1. Create a config file in your project root:
```json
{
  "schemaDirectory": "./api-schemas",
  "validation": {
    "strict": true
  }
}
```

2. Specify config path explicitly:
```bash
api-tools list --config ./config.json
```

### Invalid Schema Directory

**Problem**: `Error: Schema directory does not exist`

**Solution**:
```bash
# Create the directory
mkdir -p api-schemas

# Or update config to point to existing directory
{
  "schemaDirectory": "./existing-schemas"
}
```

### Environment Variable Issues

**Problem**: Environment variables not being recognized.

**Solution**:
```bash
# Set environment variables properly
export API_TOOLS_SCHEMA_DIR=/path/to/schemas
export API_TOOLS_HTTP_TIMEOUT=60000

# Or use .env file
echo "API_TOOLS_SCHEMA_DIR=/path/to/schemas" >> .env
```

## Network Errors

### Connection Timeout

**Problem**: `RequestTimeoutError: Request timeout after 30000ms`

**Solution**:
1. Increase timeout in config:
```json
{
  "http": {
    "defaultTimeout": 60000
  }
}
```

2. Or per-request:
```bash
api-tools test my-api --timeout 60000
```

### DNS Resolution Failures

**Problem**: `ENOTFOUND` or `DNS lookup failed`

**Solution**:
1. Check URL validity:
```bash
# Verify DNS resolution
nslookup api.example.com
```

2. Check network connectivity:
```bash
ping api.example.com
```

3. Try using IP address instead of hostname

### SSL Certificate Errors

**Problem**: `UNABLE_TO_VERIFY_LEAF_SIGNATURE` or certificate errors

**Solution**:
1. For self-signed certificates in development:
```bash
# Temporary workaround (NOT for production)
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

2. Add certificate to trusted store:
```bash
export NODE_EXTRA_CA_CERTS=/path/to/ca-cert.pem
```

### Proxy Configuration

**Problem**: Cannot connect through corporate proxy

**Solution**:
```bash
# Set proxy environment variables
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080
export NO_PROXY=localhost,127.0.0.1
```

## API Testing Issues

### Rate Limiting

**Problem**: `429 Too Many Requests` errors

**Solution**:
1. Enable retry with backoff:
```json
{
  "http": {
    "maxRetries": 5,
    "retryDelay": 2000
  }
}
```

2. Implement request throttling in your tests

### Circuit Breaker Open

**Problem**: `Circuit breaker is OPEN` errors

**Solution**:
1. Wait for circuit reset (default 60 seconds)
2. Disable circuit breaker for specific requests:
```javascript
await apiTester.executeRequest(request, {
  disableCircuitBreaker: true
});
```

3. Check why the service is failing repeatedly

### Large Response Handling

**Problem**: Memory issues with large responses

**Solution**:
1. Increase Node.js memory limit:
```bash
node --max-old-space-size=4096 api-tools test my-api
```

2. Use streaming for large responses (if supported)

## Schema Validation Errors

### Missing Required Fields

**Problem**: `Validation error: Missing required field: baseURL`

**Solution**:
Ensure all required fields are present:
```yaml
id: my-api
name: My API
version: 1.0.0
baseURL: https://api.example.com  # Required
endpoints: []  # Required
```

### Invalid Parameter Types

**Problem**: `Invalid parameter type: expected string, got number`

**Solution**:
Check parameter definitions:
```yaml
parameters:
  - name: userId
    type: string  # Must match actual usage
    required: true
    location: path
```

### Schema File Format

**Problem**: Cannot parse schema file

**Solution**:
1. Validate YAML syntax:
```bash
# Install yaml-lint
npm install -g yaml-lint
yamllint api-schemas/my-api.yaml
```

2. Ensure proper file extension (.yaml or .yml)

## Performance Problems

### Slow API Response Times

**Problem**: API requests taking too long

**Solution**:
1. Enable response time logging:
```bash
export API_TOOLS_LOG_LEVEL=debug
```

2. Analyze slow endpoints:
- Check network latency
- Verify server performance
- Consider caching responses

### High Memory Usage

**Problem**: Process using excessive memory

**Solution**:
1. Monitor memory usage:
```bash
# Check process memory
ps aux | grep api-tools
```

2. Limit concurrent requests:
```javascript
// Process APIs in batches
const batchSize = 10;
```

### CPU Spikes

**Problem**: High CPU usage during operations

**Solution**:
1. Profile the application:
```bash
node --prof api-tools test my-api
```

2. Optimize regex patterns in schemas
3. Reduce validation complexity

## Debugging Tips

### Enable Debug Logging

```bash
# Set log level
export API_TOOLS_LOG_LEVEL=debug

# Or use debug flag
api-tools test my-api --debug
```

### Inspect HTTP Traffic

```bash
# Use environment variable
export NODE_DEBUG=http

# Or use proxy for inspection
export HTTP_PROXY=http://localhost:8888
```

### Check Configuration

```bash
# Display current configuration
api-tools config show

# Validate configuration
api-tools config validate
```

### Common Debug Commands

```bash
# Check version compatibility
api-tools --version

# List all available APIs
api-tools list --verbose

# Validate specific API
api-tools validate my-api --debug

# Test with minimal retry
api-tools test my-api --max-retries 0
```

### Getting Help

If you continue to experience issues:

1. Check the [GitHub Issues](https://github.com/your-org/api-tools-mcp/issues)
2. Enable debug logging and collect logs
3. Include the following in bug reports:
   - Node.js version (`node --version`)
   - API Tools version (`api-tools --version`)
   - Operating system
   - Error messages and stack traces
   - Minimal reproduction steps

### Useful Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_TOOLS_LOG_LEVEL` | Logging level (debug, info, warn, error) | info |
| `API_TOOLS_SCHEMA_DIR` | Schema directory path | ./schemas |
| `API_TOOLS_HTTP_TIMEOUT` | Default HTTP timeout (ms) | 30000 |
| `API_TOOLS_MAX_RETRIES` | Default retry attempts | 3 |
| `NODE_TLS_REJECT_UNAUTHORIZED` | Skip SSL verification (dev only) | 1 |
| `HTTP_PROXY` | HTTP proxy URL | - |
| `HTTPS_PROXY` | HTTPS proxy URL | - |