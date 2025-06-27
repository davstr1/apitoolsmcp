# HTTP Client Implementation Notes

## Why Not Axios?

Axios automatically injects several headers that can interfere with API testing:
- `User-Agent`
- `Accept`
- `Accept-Encoding`
- Sometimes `Content-Length`
- Transform requests/responses

This can cause issues when testing APIs that:
- Have strict header validation
- Reject requests with unexpected headers
- Require exact header control
- Need specific User-Agent strings

## Better Alternatives

### Option 1: node-fetch (Recommended for MVP)
```javascript
import fetch from 'node-fetch';

const response = await fetch(url, {
  method: 'GET',
  headers: {
    // Only headers we explicitly set
    'X-API-Key': 'abc123'
  }
});
```

Pros:
- Minimal default headers
- Familiar fetch API
- Good TypeScript support
- Reasonable control

Cons:
- Still adds some headers (Host, Connection)
- Not 100% raw

### Option 2: Native https/http modules (Ultimate Control)
```javascript
import * as https from 'https';
import * as http from 'http';

const options = {
  hostname: 'api.example.com',
  port: 443,
  path: '/endpoint',
  method: 'GET',
  headers: {
    // Complete control over headers
  }
};

const req = https.request(options, (res) => {
  // Handle response
});
```

Pros:
- Complete control over request
- No automatic headers except required ones
- Can handle edge cases
- Direct socket access if needed

Cons:
- More complex API
- Need to handle redirects manually
- More code for simple requests

## Implementation Strategy

1. Start with node-fetch for MVP
2. Add option for "raw mode" using https/http
3. Let user choose level of control needed
4. Default to node-fetch for simplicity
5. Switch to raw for problematic APIs

## Header Control Features

The CLI should support:
- Viewing exact headers being sent
- Disabling any automatic headers
- Raw mode for complete control
- Header preview before sending
- Common header templates (but optional)