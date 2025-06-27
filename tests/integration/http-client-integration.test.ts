import { ApiTester } from '../../src/services/api-tester';
import { HttpMethod } from '../../src/types/http';

describe('Integration: HTTP Client', () => {
  let apiTester: ApiTester;
  
  beforeEach(() => {
    apiTester = new ApiTester();
  });
  
  it('should make real HTTP request to httpbin.org', async () => {
    const result = await apiTester.executeRequest({
      url: 'https://httpbin.org/get',
      method: HttpMethod.GET,
      headers: {
        'User-Agent': 'api-tools-mcp/test',
      },
      params: {
        test: 'value',
        foo: 'bar',
      },
    });
    
    expect(result.success).toBe(true);
    expect(result.response.status).toBe(200);
    expect(result.response.body.args).toEqual({
      test: 'value',
      foo: 'bar',
    });
    expect(result.response.body.headers['User-Agent']).toBe('api-tools-mcp/test');
  });
  
  it('should handle POST requests with JSON body', async () => {
    const testData = {
      name: 'Test User',
      email: 'test@example.com',
      nested: {
        field1: 'value1',
        field2: 123,
      },
    };
    
    const result = await apiTester.executeRequest({
      url: 'https://httpbin.org/post',
      method: HttpMethod.POST,
      headers: {
        'Content-Type': 'application/json',
      },
      body: testData,
    });
    
    expect(result.success).toBe(true);
    expect(result.response.status).toBe(200);
    expect(result.response.body.json).toEqual(testData);
    expect(result.response.body.headers['Content-Type']).toBe('application/json');
  });
  
  it('should handle different HTTP methods', async () => {
    const methods: HttpMethod[] = [
      HttpMethod.GET,
      HttpMethod.POST,
      HttpMethod.PUT,
      HttpMethod.DELETE,
      HttpMethod.PATCH,
    ];
    
    for (const method of methods) {
      const result = await apiTester.executeRequest({
        url: `https://httpbin.org/${method.toLowerCase()}`,
        method,
        headers: {
          'X-Test-Method': method,
        },
        body: method !== HttpMethod.GET ? { test: 'data' } : undefined,
      });
      
      expect(result.success).toBe(true);
      expect(result.response.status).toBe(200);
    }
  });
  
  it('should handle authentication headers', async () => {
    const token = 'Bearer test-token-12345';
    
    const result = await apiTester.executeRequest({
      url: 'https://httpbin.org/bearer',
      method: HttpMethod.GET,
      headers: {
        'Authorization': token,
      },
    });
    
    expect(result.success).toBe(true);
    expect(result.response.status).toBe(200);
    expect(result.response.body.token).toBe('test-token-12345');
  });
  
  it('should handle redirects', async () => {
    const result = await apiTester.executeRequest({
      url: 'https://httpbin.org/redirect/3',
      method: HttpMethod.GET,
      headers: {},
    });
    
    expect(result.success).toBe(true);
    expect(result.response.status).toBe(200);
    expect(result.response.body.url).toBe('https://httpbin.org/get');
  });
  
  it('should handle status codes correctly', async () => {
    const statusCodes = [200, 201, 204, 400, 401, 403, 404, 500, 502, 503];
    
    for (const status of statusCodes) {
      const result = await apiTester.executeRequest({
        url: `https://httpbin.org/status/${status}`,
        method: HttpMethod.GET,
        headers: {},
      }, { maxRetries: 0 });
      
      expect(result.response.status).toBe(status);
      
      if (status >= 200 && status < 300) {
        expect(result.success).toBe(true);
      } else {
        expect(result.success).toBe(false);
      }
    }
  });
  
  it('should handle delays and timeouts', async () => {
    // Test successful delayed response
    const result1 = await apiTester.executeRequest({
      url: 'https://httpbin.org/delay/1',
      method: HttpMethod.GET,
      headers: {},
      timeout: 5000,
    });
    
    expect(result1.success).toBe(true);
    expect(result1.response.responseTime).toBeGreaterThan(1000);
    
    // Test timeout
    const result2 = await apiTester.executeRequest({
      url: 'https://httpbin.org/delay/3',
      method: HttpMethod.GET,
      headers: {},
      timeout: 1000,
    }, { maxRetries: 0 });
    
    expect(result2.success).toBe(false);
    expect(result2.error).toContain('timeout');
  });
  
  it('should handle gzip compression', async () => {
    const result = await apiTester.executeRequest({
      url: 'https://httpbin.org/gzip',
      method: HttpMethod.GET,
      headers: {
        'Accept-Encoding': 'gzip',
      },
    });
    
    expect(result.success).toBe(true);
    expect(result.response.body.gzipped).toBe(true);
  });
});