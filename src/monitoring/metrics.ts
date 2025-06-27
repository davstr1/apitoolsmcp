import { Counter, Histogram, Gauge, Registry } from 'prom-client';

// Create a registry for metrics
export const metricsRegistry = new Registry();

// Request metrics
export const httpRequestsTotal = new Counter({
  name: 'api_tools_http_requests_total',
  help: 'Total number of HTTP requests made',
  labelNames: ['method', 'status', 'api'],
  registers: [metricsRegistry],
});

export const httpRequestDuration = new Histogram({
  name: 'api_tools_http_request_duration_seconds',
  help: 'HTTP request latency in seconds',
  labelNames: ['method', 'status', 'api'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [metricsRegistry],
});

// Error metrics
export const errorsTotal = new Counter({
  name: 'api_tools_errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'api'],
  registers: [metricsRegistry],
});

// Schema metrics
export const schemaValidationDuration = new Histogram({
  name: 'api_tools_schema_validation_duration_seconds',
  help: 'Schema validation duration in seconds',
  labelNames: ['api', 'valid'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1],
  registers: [metricsRegistry],
});

export const schemasLoaded = new Gauge({
  name: 'api_tools_schemas_loaded',
  help: 'Number of schemas currently loaded',
  registers: [metricsRegistry],
});

// Circuit breaker metrics
export const circuitBreakerState = new Gauge({
  name: 'api_tools_circuit_breaker_state',
  help: 'Circuit breaker state (0=closed, 1=open, 2=half-open)',
  labelNames: ['host'],
  registers: [metricsRegistry],
});

export const circuitBreakerFailures = new Counter({
  name: 'api_tools_circuit_breaker_failures_total',
  help: 'Total number of circuit breaker failures',
  labelNames: ['host'],
  registers: [metricsRegistry],
});

// Retry metrics
export const retryAttempts = new Counter({
  name: 'api_tools_retry_attempts_total',
  help: 'Total number of retry attempts',
  labelNames: ['api', 'success'],
  registers: [metricsRegistry],
});

// Cache metrics
export const cacheHits = new Counter({
  name: 'api_tools_cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type'],
  registers: [metricsRegistry],
});

export const cacheMisses = new Counter({
  name: 'api_tools_cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type'],
  registers: [metricsRegistry],
});

// Active connections
export const activeConnections = new Gauge({
  name: 'api_tools_active_connections',
  help: 'Number of active HTTP connections',
  registers: [metricsRegistry],
});

// Memory usage
export const memoryUsage = new Gauge({
  name: 'api_tools_memory_usage_bytes',
  help: 'Process memory usage',
  labelNames: ['type'],
  registers: [metricsRegistry],
});

// Update memory metrics periodically
setInterval(() => {
  const usage = process.memoryUsage();
  memoryUsage.set({ type: 'heap_total' }, usage.heapTotal);
  memoryUsage.set({ type: 'heap_used' }, usage.heapUsed);
  memoryUsage.set({ type: 'rss' }, usage.rss);
  memoryUsage.set({ type: 'external' }, usage.external);
}, 10000); // Every 10 seconds

// Helper functions for tracking metrics
export function trackHttpRequest(
  method: string,
  status: number,
  api: string,
  duration: number
): void {
  httpRequestsTotal.inc({ method, status: String(status), api });
  httpRequestDuration.observe({ method, status: String(status), api }, duration / 1000);
}

export function trackError(type: string, api?: string): void {
  errorsTotal.inc({ type, api: api || 'unknown' });
}

export function trackSchemaValidation(api: string, valid: boolean, duration: number): void {
  schemaValidationDuration.observe({ api, valid: String(valid) }, duration / 1000);
}

export function trackRetry(api: string, success: boolean): void {
  retryAttempts.inc({ api, success: String(success) });
}

export function trackCacheAccess(cacheType: string, hit: boolean): void {
  if (hit) {
    cacheHits.inc({ cache_type: cacheType });
  } else {
    cacheMisses.inc({ cache_type: cacheType });
  }
}

export function updateCircuitBreakerState(
  host: string,
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
): void {
  const stateValue = state === 'CLOSED' ? 0 : state === 'OPEN' ? 1 : 2;
  circuitBreakerState.set({ host }, stateValue);
}

export function trackCircuitBreakerFailure(host: string): void {
  circuitBreakerFailures.inc({ host });
}

// Export function to get all metrics
export async function getMetrics(): Promise<string> {
  return metricsRegistry.metrics();
}

// Export function to get metrics in JSON format
export async function getMetricsJson(): Promise<object> {
  return metricsRegistry.getMetricsAsJSON();
}
