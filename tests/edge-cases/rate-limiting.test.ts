import { ApiTester } from '../../src/services/api-tester';
import { HttpMethod } from '../../src/types/http';
import * as nock from 'nock';

describe('Edge Cases: Rate Limiting', () => {
  let apiTester: ApiTester;
  let requestCount = 0;
  
  beforeEach(() => {
    apiTester = new ApiTester();
    requestCount = 0;
    nock.cleanAll();
  });
  
  afterEach(() => {
    nock.cleanAll();
  });
  
  it('should handle 429 Too Many Requests', async () => {
    nock('https://api.example.com')
      .get('/rate-limited')
      .reply(429, { error: 'Too many requests' }, {
        'Retry-After': '60',
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Date.now() / 1000 + 60),
      });
    
    const result = await apiTester.executeRequest({
      url: 'https://api.example.com/rate-limited',
      method: HttpMethod.GET,
      headers: {},
    }, { maxRetries: 0 });
    
    expect(result.success).toBe(false);
    expect(result.response.status).toBe(429);
    expect(result.response.headers['retry-after']).toBe('60');
  });
  
  it('should retry with exponential backoff on rate limit', async () => {
    const timestamps: number[] = [];
    
    nock('https://api.example.com')
      .get('/rate-limited-retry')
      .times(3)
      .reply(() => {
        timestamps.push(Date.now());
        requestCount++;
        if (requestCount < 3) {
          return [429, { error: 'Rate limited' }, { 'Retry-After': '1' }];
        }
        return [200, { data: 'success' }];
      });
    
    const start = Date.now();
    const result = await apiTester.executeRequest({
      url: 'https://api.example.com/rate-limited-retry',
      method: HttpMethod.GET,
      headers: {},
    });
    
    expect(result.success).toBe(true);
    expect(requestCount).toBe(3);
    
    // Check exponential backoff timing
    if (timestamps.length >= 2) {
      const firstDelay = timestamps[1] - timestamps[0];
      const secondDelay = timestamps[2] - timestamps[1];
      expect(secondDelay).toBeGreaterThan(firstDelay);
    }
  });
  
  it('should handle rate limit headers correctly', async () => {
    const resetTime = Math.floor(Date.now() / 1000) + 300; // 5 minutes from now
    
    nock('https://api.example.com')
      .get('/with-headers')
      .reply(200, { data: 'test' }, {
        'X-RateLimit-Limit': '1000',
        'X-RateLimit-Remaining': '999',
        'X-RateLimit-Reset': String(resetTime),
        'X-RateLimit-Used': '1',
      });
    
    const result = await apiTester.executeRequest({
      url: 'https://api.example.com/with-headers',
      method: HttpMethod.GET,
      headers: {},
    });
    
    expect(result.success).toBe(true);
    expect(result.response.headers['x-ratelimit-limit']).toBe('1000');
    expect(result.response.headers['x-ratelimit-remaining']).toBe('999');
    expect(result.response.headers['x-ratelimit-reset']).toBe(String(resetTime));
  });
  
  it('should handle concurrent requests approaching rate limit', async () => {
    let remaining = 5;
    
    nock('https://api.example.com')
      .get('/concurrent')
      .times(10)
      .reply(() => {
        remaining--;
        if (remaining < 0) {
          return [429, { error: 'Rate limit exceeded' }];
        }
        return [200, { data: 'success', remaining }];
      });
    
    // Make concurrent requests
    const promises = Array(10).fill(null).map(() =>
      apiTester.executeRequest({
        url: 'https://api.example.com/concurrent',
        method: HttpMethod.GET,
        headers: {},
      }, { maxRetries: 0 })
    );
    
    const results = await Promise.all(promises);
    
    const successful = results.filter(r => r.success).length;
    const rateLimited = results.filter(r => !r.success && r.response.status === 429).length;
    
    expect(successful).toBeLessThanOrEqual(5);
    expect(rateLimited).toBeGreaterThan(0);
  });
  
  it('should parse different Retry-After formats', async () => {
    // Test with seconds
    nock('https://api.example.com')
      .get('/retry-seconds')
      .reply(429, { error: 'Rate limited' }, {
        'Retry-After': '120',
      });
    
    // Test with HTTP date
    const futureDate = new Date(Date.now() + 180000).toUTCString();
    nock('https://api.example.com')
      .get('/retry-date')
      .reply(429, { error: 'Rate limited' }, {
        'Retry-After': futureDate,
      });
    
    const result1 = await apiTester.executeRequest({
      url: 'https://api.example.com/retry-seconds',
      method: HttpMethod.GET,
      headers: {},
    }, { maxRetries: 0 });
    
    const result2 = await apiTester.executeRequest({
      url: 'https://api.example.com/retry-date',
      method: HttpMethod.GET,
      headers: {},
    }, { maxRetries: 0 });
    
    expect(result1.response.headers['retry-after']).toBe('120');
    expect(result2.response.headers['retry-after']).toBe(futureDate);
  });
});