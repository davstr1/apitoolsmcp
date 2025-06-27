import { ApiTester } from '../../src/services/api-tester';
import { HttpMethod } from '../../src/types/http';
import * as nock from 'nock';

describe('Edge Cases: Concurrent Requests', () => {
  let apiTester: ApiTester;
  
  beforeEach(() => {
    apiTester = new ApiTester();
    nock.cleanAll();
  });
  
  afterEach(() => {
    nock.cleanAll();
  });
  
  it('should handle multiple concurrent requests to same endpoint', async () => {
    let requestCount = 0;
    
    nock('https://api.example.com')
      .get('/concurrent')
      .times(10)
      .reply(() => {
        requestCount++;
        return [200, { id: requestCount, data: 'success' }];
      });
    
    const promises = Array(10).fill(null).map((_, index) =>
      apiTester.executeRequest({
        url: 'https://api.example.com/concurrent',
        method: HttpMethod.GET,
        headers: { 'X-Request-ID': String(index) },
      })
    );
    
    const results = await Promise.all(promises);
    
    expect(results).toHaveLength(10);
    expect(results.every(r => r.success)).toBe(true);
    expect(requestCount).toBe(10);
    
    // Verify each request got a unique response
    const ids = results.map(r => r.response.body.id);
    expect(new Set(ids).size).toBe(10);
  });
  
  it('should handle concurrent requests to different endpoints', async () => {
    const endpoints = ['/api1', '/api2', '/api3', '/api4', '/api5'];
    
    endpoints.forEach(endpoint => {
      nock('https://api.example.com')
        .get(endpoint)
        .times(2)
        .reply(200, { endpoint, data: 'success' });
    });
    
    const promises = [];
    for (let i = 0; i < 10; i++) {
      const endpoint = endpoints[i % endpoints.length];
      promises.push(
        apiTester.executeRequest({
          url: `https://api.example.com${endpoint}`,
          method: HttpMethod.GET,
          headers: {},
        })
      );
    }
    
    const results = await Promise.all(promises);
    
    expect(results).toHaveLength(10);
    expect(results.every(r => r.success)).toBe(true);
    
    // Verify responses match their endpoints
    results.forEach((result, index) => {
      const expectedEndpoint = endpoints[index % endpoints.length];
      expect(result.response.body.endpoint).toBe(expectedEndpoint);
    });
  });
  
  it('should handle mixed success and failure in concurrent requests', async () => {
    nock('https://api.example.com')
      .get('/mixed')
      .times(10)
      .reply(function() {
        // Alternate between success and failure
        const requestIndex = this.req.headers['x-request-index'];
        const index = parseInt(requestIndex as string);
        
        if (index % 2 === 0) {
          return [200, { status: 'success', index }];
        } else {
          return [500, { error: 'Server error', index }];
        }
      });
    
    const promises = Array(10).fill(null).map((_, index) =>
      apiTester.executeRequest({
        url: 'https://api.example.com/mixed',
        method: HttpMethod.GET,
        headers: { 'X-Request-Index': String(index) },
      }, { maxRetries: 0 })
    );
    
    const results = await Promise.all(promises);
    
    const successes = results.filter(r => r.success);
    const failures = results.filter(r => !r.success);
    
    expect(successes).toHaveLength(5);
    expect(failures).toHaveLength(5);
  });
  
  it('should respect circuit breaker with concurrent requests', async () => {
    let failCount = 0;
    
    nock('https://api.example.com')
      .get('/circuit-test')
      .times(20)
      .reply(() => {
        failCount++;
        return [500, { error: 'Server error' }];
      });
    
    // Make concurrent requests that should trigger circuit breaker
    const promises = Array(20).fill(null).map(() =>
      apiTester.executeRequest({
        url: 'https://api.example.com/circuit-test',
        method: HttpMethod.GET,
        headers: {},
      }, { maxRetries: 0 })
    );
    
    const results = await Promise.all(promises);
    
    // Some requests should fail due to circuit breaker
    const circuitBreakerErrors = results.filter(
      r => !r.success && r.error?.includes('Circuit breaker')
    );
    
    expect(circuitBreakerErrors.length).toBeGreaterThan(0);
    // Not all requests should hit the server due to circuit breaker
    expect(failCount).toBeLessThan(20);
  });
  
  it('should handle request queuing and backpressure', async () => {
    const delays = [100, 200, 150, 250, 50];
    let activeRequests = 0;
    let maxConcurrent = 0;
    
    nock('https://api.example.com')
      .get(/\/delay-\d+/)
      .times(5)
      .delay(body => {
        const match = this.req.path.match(/delay-(\d+)/);
        return parseInt(match[1]);
      })
      .reply(function() {
        activeRequests++;
        maxConcurrent = Math.max(maxConcurrent, activeRequests);
        
        setTimeout(() => {
          activeRequests--;
        }, 10);
        
        return [200, { path: this.req.path }];
      });
    
    const promises = delays.map((delay, index) =>
      apiTester.executeRequest({
        url: `https://api.example.com/delay-${delay}`,
        method: HttpMethod.GET,
        headers: {},
      })
    );
    
    const results = await Promise.all(promises);
    
    expect(results).toHaveLength(5);
    expect(results.every(r => r.success)).toBe(true);
    expect(maxConcurrent).toBeGreaterThan(1); // Should have concurrent requests
  });
  
  it('should handle race conditions in circuit breaker', async () => {
    // Create a new ApiTester instance for isolated circuit breaker
    const tester = new ApiTester();
    let requestId = 0;
    
    nock('https://api.example.com')
      .get('/race')
      .times(50)
      .reply(function() {
        const id = ++requestId;
        // First 10 requests succeed, then fail
        if (id <= 10) {
          return [200, { id, status: 'success' }];
        }
        return [500, { id, error: 'Server error' }];
      });
    
    // Fire 50 requests concurrently
    const promises = Array(50).fill(null).map(() =>
      tester.executeRequest({
        url: 'https://api.example.com/race',
        method: HttpMethod.GET,
        headers: {},
      }, { maxRetries: 0 })
    );
    
    const results = await Promise.all(promises);
    
    // Circuit breaker should have opened at some point
    const circuitBreakerErrors = results.filter(
      r => !r.success && r.error?.includes('Circuit breaker')
    );
    
    expect(circuitBreakerErrors.length).toBeGreaterThan(0);
    
    // But not all requests after the 10th should be circuit breaker errors
    // due to race conditions
    const serverErrors = results.filter(
      r => !r.success && r.response?.status === 500
    );
    
    expect(serverErrors.length).toBeGreaterThan(0);
  });
});