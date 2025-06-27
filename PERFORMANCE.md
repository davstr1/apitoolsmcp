# Performance Optimization Guide

This guide provides recommendations for optimizing API Tools MCP performance in production environments.

## Table of Contents

- [Performance Considerations](#performance-considerations)
- [Optimization Strategies](#optimization-strategies)
- [Caching](#caching)
- [Rate Limiting](#rate-limiting)
- [Connection Pooling](#connection-pooling)
- [Monitoring & Metrics](#monitoring--metrics)
- [Benchmarking](#benchmarking)
- [Best Practices](#best-practices)

## Performance Considerations

### Resource Usage

Monitor and optimize resource consumption:

```javascript
// Memory usage monitoring
console.log('Memory Usage:', process.memoryUsage());
// {
//   rss: 54325248,        // Resident Set Size
//   heapTotal: 18939904,  // Total heap size
//   heapUsed: 8661624,    // Used heap size
//   external: 1073741,    // C++ objects
//   arrayBuffers: 10422   // ArrayBuffers
// }

// CPU usage monitoring
const startUsage = process.cpuUsage();
// ... perform operations ...
const endUsage = process.cpuUsage(startUsage);
console.log('CPU time used:', endUsage);
```

### Response Time Goals

Set performance targets:
- API response time: < 200ms (p95)
- Schema validation: < 50ms
- File operations: < 100ms
- Total request processing: < 500ms

## Optimization Strategies

### 1. Request Batching

Batch multiple requests to reduce overhead:

```javascript
class BatchProcessor {
  constructor(batchSize = 10, flushInterval = 100) {
    this.batch = [];
    this.batchSize = batchSize;
    this.flushInterval = flushInterval;
    this.timer = null;
  }

  add(request) {
    this.batch.push(request);
    
    if (this.batch.length >= this.batchSize) {
      this.flush();
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.flushInterval);
    }
  }

  async flush() {
    if (this.batch.length === 0) return;
    
    const requests = this.batch.splice(0);
    clearTimeout(this.timer);
    this.timer = null;
    
    // Process batch in parallel
    await Promise.all(requests.map(req => this.process(req)));
  }
}
```

### 2. Parallel Processing

Leverage parallel execution:

```javascript
// Sequential (slow)
for (const api of apis) {
  await validateSchema(api);
}

// Parallel (fast)
await Promise.all(apis.map(api => validateSchema(api)));

// Controlled concurrency
const pLimit = require('p-limit');
const limit = pLimit(5); // Max 5 concurrent

await Promise.all(
  apis.map(api => limit(() => validateSchema(api)))
);
```

### 3. Lazy Loading

Load resources only when needed:

```javascript
class SchemaLoader {
  constructor() {
    this.cache = new Map();
  }

  async getSchema(id) {
    if (!this.cache.has(id)) {
      const schema = await this.loadSchema(id);
      this.cache.set(id, schema);
    }
    return this.cache.get(id);
  }

  async loadSchema(id) {
    // Load from disk only when needed
    return fs.readFile(`schemas/${id}.yaml`, 'utf8');
  }
}
```

### 4. Stream Processing

Use streams for large data:

```javascript
const { pipeline } = require('stream/promises');
const { createReadStream, createWriteStream } = require('fs');
const { Transform } = require('stream');

// Process large files efficiently
async function processLargeFile(inputPath, outputPath) {
  const processStream = new Transform({
    transform(chunk, encoding, callback) {
      // Process chunk
      const processed = processChunk(chunk);
      callback(null, processed);
    }
  });

  await pipeline(
    createReadStream(inputPath),
    processStream,
    createWriteStream(outputPath)
  );
}
```

## Caching

### In-Memory Caching

Implement efficient caching:

```javascript
class LRUCache {
  constructor(maxSize = 100, ttl = 3600000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  set(key, value) {
    // Delete oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      expires: Date.now() + this.ttl
    });
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, item);
    
    return item.value;
  }
}

// Usage
const schemaCache = new LRUCache(50, 300000); // 50 items, 5 min TTL
```

### Redis Caching

For distributed caching:

```javascript
const Redis = require('ioredis');
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: 3
});

class RedisCache {
  async get(key) {
    const value = await redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  async set(key, value, ttl = 3600) {
    await redis.setex(key, ttl, JSON.stringify(value));
  }

  async invalidate(pattern) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }
}
```

### Cache Warming

Preload frequently used data:

```javascript
async function warmCache() {
  const popularApis = await getPopularApis();
  
  await Promise.all(
    popularApis.map(api => 
      schemaCache.set(api.id, api.schema)
    )
  );
  
  logger.info('Cache warmed with %d APIs', popularApis.length);
}

// Run on startup
warmCache().catch(console.error);
```

## Rate Limiting

### Token Bucket Algorithm

Implement efficient rate limiting:

```javascript
class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.lastRefill = Date.now();
  }

  consume(tokens = 1) {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    return false;
  }

  refill() {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsed * this.refillRate;
    
    this.tokens = Math.min(
      this.capacity,
      this.tokens + tokensToAdd
    );
    
    this.lastRefill = now;
  }
}

// Usage: 100 requests per minute
const rateLimiter = new TokenBucket(100, 100/60);

if (!rateLimiter.consume()) {
  throw new Error('Rate limit exceeded');
}
```

### Distributed Rate Limiting

Using Redis for distributed systems:

```javascript
class DistributedRateLimiter {
  constructor(redis, key, limit, window) {
    this.redis = redis;
    this.key = key;
    this.limit = limit;
    this.window = window; // seconds
  }

  async checkLimit(identifier) {
    const key = `${this.key}:${identifier}`;
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, this.window);
    }
    
    return current <= this.limit;
  }
}
```

## Connection Pooling

### HTTP Connection Pooling

Reuse connections for better performance:

```javascript
const http = require('http');
const https = require('https');

// Configure agents with connection pooling
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 1000,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60000
});

// Use in requests
const options = {
  agent: url.protocol === 'https:' ? httpsAgent : httpAgent
};
```

### Database Connection Pooling

For database operations:

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'api_tools',
  user: 'user',
  password: 'password',
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Use pool for queries
async function query(text, params) {
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  
  logger.debug('Query executed', { text, duration });
  return res;
}
```

## Monitoring & Metrics

### Performance Metrics

Track key performance indicators:

```javascript
const prometheus = require('prom-client');

// Response time histogram
const httpDuration = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Request counter
const httpRequests = new prometheus.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status']
});

// Active connections gauge
const activeConnections = new prometheus.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

// Middleware to track metrics
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    
    httpDuration
      .labels(req.method, req.route?.path || 'unknown', res.statusCode)
      .observe(duration);
      
    httpRequests
      .labels(req.method, req.route?.path || 'unknown', res.statusCode)
      .inc();
  });
  
  next();
});
```

### APM Integration

Application Performance Monitoring:

```javascript
// Datadog APM
const tracer = require('dd-trace').init({
  service: 'api-tools-mcp',
  env: 'production',
  version: '1.0.0'
});

// New Relic
require('newrelic');

// Elastic APM
const apm = require('elastic-apm-node').start({
  serviceName: 'api-tools-mcp',
  environment: 'production'
});
```

## Benchmarking

### Load Testing

Use tools to measure performance:

```bash
# Apache Bench
ab -n 1000 -c 10 http://localhost:3000/api/test

# Artillery
artillery quick --count 50 --num 10 http://localhost:3000/api/test

# k6
k6 run loadtest.js
```

### Benchmark Script

```javascript
// loadtest.js for k6
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.1'],
  },
};

export default function() {
  const res = http.get('http://localhost:3000/api/test');
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

## Best Practices

### 1. Optimize Schema Validation

Cache compiled schemas:

```javascript
const Ajv = require('ajv');
const ajv = new Ajv({ cache: true });

const compiledSchemas = new Map();

function getCompiledSchema(schema) {
  const key = JSON.stringify(schema);
  
  if (!compiledSchemas.has(key)) {
    compiledSchemas.set(key, ajv.compile(schema));
  }
  
  return compiledSchemas.get(key);
}
```

### 2. Efficient File Operations

Use async I/O and buffers:

```javascript
// Read multiple files in parallel
async function readSchemas(ids) {
  const promises = ids.map(id => 
    fs.readFile(`schemas/${id}.yaml`, 'utf8')
  );
  
  return Promise.all(promises);
}

// Use streams for large files
function processLargeSchema(path) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = fs.createReadStream(path);
    
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
```

### 3. Memory Management

Prevent memory leaks:

```javascript
// Clear unused caches periodically
setInterval(() => {
  if (global.gc) {
    global.gc();
  }
  
  // Clear old cache entries
  for (const [key, value] of cache.entries()) {
    if (isExpired(value)) {
      cache.delete(key);
    }
  }
}, 300000); // Every 5 minutes

// Monitor memory usage
setInterval(() => {
  const usage = process.memoryUsage();
  
  if (usage.heapUsed > 500 * 1024 * 1024) { // 500MB
    logger.warn('High memory usage detected', usage);
  }
}, 60000); // Every minute
```

### 4. Graceful Degradation

Handle high load gracefully:

```javascript
class CircuitBreaker {
  constructor(threshold = 5, timeout = 60000) {
    this.failures = 0;
    this.threshold = threshold;
    this.timeout = timeout;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

### 5. Performance Checklist

Before deployment:
- [ ] Enable gzip compression
- [ ] Implement caching strategy
- [ ] Configure connection pooling
- [ ] Set up rate limiting
- [ ] Add performance monitoring
- [ ] Optimize database queries
- [ ] Minimize payload sizes
- [ ] Use CDN for static assets
- [ ] Enable HTTP/2
- [ ] Configure load balancing

## Performance Targets

| Metric | Target | Critical |
|--------|--------|----------|
| API Response Time (p50) | < 100ms | < 200ms |
| API Response Time (p95) | < 200ms | < 500ms |
| API Response Time (p99) | < 500ms | < 1000ms |
| Error Rate | < 0.1% | < 1% |
| Throughput | > 1000 req/s | > 500 req/s |
| CPU Usage | < 70% | < 90% |
| Memory Usage | < 1GB | < 2GB |
| Cache Hit Rate | > 80% | > 60% |

## Troubleshooting Performance Issues

1. **Identify bottlenecks**: Use profiling tools
2. **Analyze metrics**: Check monitoring dashboards
3. **Review logs**: Look for slow queries or operations
4. **Test locally**: Reproduce issues in development
5. **Optimize code**: Apply fixes and measure impact
6. **Deploy gradually**: Use canary deployments
7. **Monitor results**: Verify improvements in production