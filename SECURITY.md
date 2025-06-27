# Security Best Practices

This document outlines security considerations and best practices for using API Tools MCP in production environments.

## Table of Contents

- [API Key Management](#api-key-management)
- [Secure Configuration](#secure-configuration)
- [Network Security](#network-security)
- [Data Protection](#data-protection)
- [Authentication & Authorization](#authentication--authorization)
- [Audit Logging](#audit-logging)
- [Vulnerability Management](#vulnerability-management)
- [Security Checklist](#security-checklist)

## API Key Management

### Never Commit Secrets

**❌ Bad Practice**:
```yaml
# api-schema.yaml
headers:
  Authorization: Bearer sk_live_abcd1234  # NEVER DO THIS
```

**✅ Good Practice**:
```yaml
# api-schema.yaml
headers:
  Authorization: Bearer ${API_KEY}
```

```bash
# Use environment variables
export API_KEY=sk_live_abcd1234
```

### Secure Storage

1. **Use a Secret Manager**:
   - AWS Secrets Manager
   - HashiCorp Vault
   - Azure Key Vault
   - Google Secret Manager

2. **Environment Files**:
```bash
# .env (add to .gitignore)
API_KEY=sk_live_abcd1234
DATABASE_URL=postgresql://user:pass@host:5432/db

# Load in application
source .env
```

3. **Encrypted Configuration**:
```bash
# Encrypt sensitive config
openssl enc -aes-256-cbc -salt -in config.json -out config.json.enc

# Decrypt when needed
openssl enc -aes-256-cbc -d -in config.json.enc -out config.json
```

### Key Rotation

Implement regular key rotation:
```javascript
// Example rotation strategy
const keys = {
  current: process.env.API_KEY,
  previous: process.env.API_KEY_PREVIOUS,
  rotationDate: '2024-01-15'
};
```

## Secure Configuration

### File Permissions

Set appropriate file permissions:
```bash
# Config files should be readable only by owner
chmod 600 config.json
chmod 600 .env

# Schema directory
chmod 700 api-schemas/
```

### Configuration Validation

Always validate configuration:
```javascript
// config-validator.js
const schema = {
  type: 'object',
  required: ['schemaDirectory'],
  properties: {
    schemaDirectory: { 
      type: 'string',
      pattern: '^[^/].*' // No absolute paths
    },
    http: {
      type: 'object',
      properties: {
        defaultTimeout: { 
          type: 'number',
          minimum: 1000,
          maximum: 300000
        }
      }
    }
  }
};
```

### Secure Defaults

Use secure defaults in configuration:
```json
{
  "http": {
    "defaultTimeout": 30000,
    "maxRetries": 3,
    "rejectUnauthorized": true  // Always verify SSL
  },
  "validation": {
    "strict": true,  // Strict validation by default
    "maxSchemaSize": 1048576  // 1MB limit
  }
}
```

## Network Security

### SSL/TLS Configuration

**Always use HTTPS in production**:
```javascript
// Enforce HTTPS
if (!request.url.startsWith('https://')) {
  throw new Error('HTTPS required for production APIs');
}
```

### Certificate Validation

```javascript
// Proper certificate validation
const https = require('https');
const agent = new https.Agent({
  rejectUnauthorized: true,
  ca: fs.readFileSync('ca-cert.pem'),  // Custom CA if needed
  checkServerIdentity: (hostname, cert) => {
    // Additional validation
    if (!cert.subject.CN.includes('trusted-domain.com')) {
      throw new Error('Invalid certificate');
    }
  }
});
```

### Request Filtering

Implement request filtering:
```javascript
// Whitelist allowed domains
const allowedDomains = [
  'api.company.com',
  'api.trusted-partner.com'
];

function validateUrl(url) {
  const parsed = new URL(url);
  if (!allowedDomains.includes(parsed.hostname)) {
    throw new Error(`Domain not allowed: ${parsed.hostname}`);
  }
}
```

## Data Protection

### Sensitive Data Handling

1. **Never log sensitive data**:
```javascript
// Bad
logger.info('Request', { headers: request.headers });

// Good
logger.info('Request', { 
  headers: sanitizeHeaders(request.headers) 
});

function sanitizeHeaders(headers) {
  const sanitized = { ...headers };
  if (sanitized.authorization) {
    sanitized.authorization = 'Bearer ***';
  }
  return sanitized;
}
```

2. **Encrypt sensitive data at rest**:
```javascript
const crypto = require('crypto');

function encrypt(text, password) {
  const algorithm = 'aes-256-gcm';
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(password, salt, 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    salt: salt.toString('hex'),
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}
```

### Response Sanitization

Clean sensitive data from responses:
```javascript
function sanitizeResponse(response) {
  const sensitive = ['password', 'token', 'secret', 'key'];
  
  function clean(obj) {
    if (typeof obj !== 'object') return obj;
    
    const cleaned = Array.isArray(obj) ? [] : {};
    
    for (const [key, value] of Object.entries(obj)) {
      if (sensitive.some(s => key.toLowerCase().includes(s))) {
        cleaned[key] = '***REDACTED***';
      } else if (typeof value === 'object') {
        cleaned[key] = clean(value);
      } else {
        cleaned[key] = value;
      }
    }
    
    return cleaned;
  }
  
  return clean(response);
}
```

## Authentication & Authorization

### API Authentication

Implement proper authentication:
```javascript
// Bearer token validation
function validateBearerToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid authorization header');
  }
  
  const token = authHeader.substring(7);
  
  // Validate token format
  if (!/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/.test(token)) {
    throw new Error('Invalid token format');
  }
  
  return token;
}
```

### Role-Based Access Control

```javascript
const permissions = {
  read: ['user', 'admin'],
  write: ['admin'],
  delete: ['admin']
};

function checkPermission(userRole, action) {
  if (!permissions[action]?.includes(userRole)) {
    throw new Error(`Insufficient permissions for ${action}`);
  }
}
```

## Audit Logging

### Security Event Logging

Log all security-relevant events:
```javascript
const auditLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ 
      filename: 'security-audit.log',
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  ]
});

function logSecurityEvent(event, details) {
  auditLogger.info({
    timestamp: new Date().toISOString(),
    event,
    details,
    user: getCurrentUser(),
    ip: getClientIP(),
    userAgent: getUserAgent()
  });
}

// Usage
logSecurityEvent('API_KEY_USED', { 
  endpoint: '/api/users',
  keyId: 'key_123' 
});
```

### Compliance Logging

For compliance requirements:
```javascript
// GDPR-compliant logging
function logDataAccess(resource, action, purpose) {
  auditLogger.info({
    type: 'DATA_ACCESS',
    resource,
    action,
    purpose,
    timestamp: new Date().toISOString(),
    user: getCurrentUser(),
    lawfulBasis: 'legitimate_interest'
  });
}
```

## Vulnerability Management

### Dependency Scanning

Regular dependency audits:
```bash
# Check for vulnerabilities
npm audit

# Fix automatically where possible
npm audit fix

# Check specific severity
npm audit --audit-level=moderate
```

### Security Headers

Implement security headers:
```javascript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```

### Input Validation

Validate all inputs:
```javascript
const validator = require('validator');

function validateApiInput(input) {
  // URL validation
  if (input.url && !validator.isURL(input.url, { 
    protocols: ['https'],
    require_protocol: true 
  })) {
    throw new Error('Invalid URL');
  }
  
  // Method validation
  const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'];
  if (!allowedMethods.includes(input.method)) {
    throw new Error('Invalid HTTP method');
  }
  
  // Header validation
  if (input.headers) {
    for (const [key, value] of Object.entries(input.headers)) {
      if (!/^[\w-]+$/.test(key)) {
        throw new Error(`Invalid header name: ${key}`);
      }
      if (typeof value !== 'string' || value.length > 8192) {
        throw new Error(`Invalid header value for ${key}`);
      }
    }
  }
}
```

## Security Checklist

### Development Phase
- [ ] Use environment variables for sensitive data
- [ ] Add .env to .gitignore
- [ ] Enable strict validation
- [ ] Implement input sanitization
- [ ] Add security headers
- [ ] Use HTTPS for all API calls
- [ ] Implement rate limiting
- [ ] Add request size limits

### Pre-Production
- [ ] Run security audit (`npm audit`)
- [ ] Update all dependencies
- [ ] Review all error messages (no sensitive data)
- [ ] Test authentication flows
- [ ] Verify SSL certificate validation
- [ ] Check file permissions
- [ ] Review logging (no secrets)
- [ ] Test rate limiting

### Production Deployment
- [ ] Enable audit logging
- [ ] Configure monitoring alerts
- [ ] Set up key rotation
- [ ] Implement backup encryption
- [ ] Configure firewall rules
- [ ] Enable DDoS protection
- [ ] Set up intrusion detection
- [ ] Document incident response

### Ongoing Maintenance
- [ ] Weekly dependency updates
- [ ] Monthly security audits
- [ ] Quarterly penetration testing
- [ ] Annual security review
- [ ] Regular key rotation
- [ ] Monitor security advisories
- [ ] Update security documentation
- [ ] Train team on security practices

## Incident Response

### Security Incident Procedure

1. **Detect**: Monitor logs and alerts
2. **Contain**: Isolate affected systems
3. **Assess**: Determine scope and impact
4. **Respond**: Apply fixes and patches
5. **Recover**: Restore normal operations
6. **Review**: Post-incident analysis

### Contact Information

- Security Team: security@company.com
- On-call: +1-555-SECURITY
- Incident Hotline: incident-response@company.com

## Additional Resources

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [npm Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)