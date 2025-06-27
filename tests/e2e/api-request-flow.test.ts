import { ApiTester } from '../../src/services/api-tester';
import { HttpMethod } from '../../src/types/http';
import { createMockServer } from '../helpers/mock-server';

describe('E2E: API Request Flow', () => {
  let mockServer: any;
  let serverUrl: string;
  let apiTester: ApiTester;
  
  beforeAll(async () => {
    // Start mock server
    mockServer = await createMockServer();
    serverUrl = `http://localhost:${mockServer.port}`;
    apiTester = new ApiTester();
  });
  
  afterAll(async () => {
    // Stop mock server
    if (mockServer) {
      await mockServer.close();
    }
  });
  
  it('should execute successful GET request', async () => {
    const result = await apiTester.executeRequest({
      url: `${serverUrl}/users`,
      method: HttpMethod.GET,
      headers: {
        'Accept': 'application/json',
      },
    });
    
    expect(result.success).toBe(true);
    expect(result.response.status).toBe(200);
    expect(result.response.body).toBeDefined();
    expect(result.response.responseTime).toBeGreaterThan(0);
  });
  
  it('should execute POST request with body', async () => {
    const requestBody = {
      name: 'Test User',
      email: 'test@example.com',
    };
    
    const result = await apiTester.executeRequest({
      url: `${serverUrl}/users`,
      method: HttpMethod.POST,
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
    });
    
    expect(result.success).toBe(true);
    expect(result.response.status).toBe(201);
    expect(result.response.body).toMatchObject(requestBody);
  });
  
  it('should handle request with query parameters', async () => {
    const result = await apiTester.executeRequest({
      url: `${serverUrl}/users`,
      method: HttpMethod.GET,
      headers: {},
      params: {
        page: '1',
        limit: '10',
      },
    });
    
    expect(result.success).toBe(true);
    expect(result.request.params).toEqual({
      page: '1',
      limit: '10',
    });
  });
  
  it('should handle 404 errors gracefully', async () => {
    const result = await apiTester.executeRequest({
      url: `${serverUrl}/non-existent`,
      method: HttpMethod.GET,
      headers: {},
    });
    
    expect(result.success).toBe(false);
    expect(result.response.status).toBe(404);
    expect(result.error).toBeDefined();
  });
  
  it('should retry on 5xx errors', async () => {
    let attempts = 0;
    mockServer.setRoute('/flaky', (req: any, res: any) => {
      attempts++;
      if (attempts < 3) {
        res.status(500).json({ error: 'Server error' });
      } else {
        res.status(200).json({ success: true });
      }
    });
    
    const result = await apiTester.executeRequest({
      url: `${serverUrl}/flaky`,
      method: HttpMethod.GET,
      headers: {},
    });
    
    expect(result.success).toBe(true);
    expect(result.response.status).toBe(200);
    expect(attempts).toBe(3);
  });
  
  it('should timeout long-running requests', async () => {
    mockServer.setRoute('/slow', (req: any, res: any) => {
      setTimeout(() => {
        res.status(200).json({ data: 'slow response' });
      }, 5000);
    });
    
    const result = await apiTester.executeRequest({
      url: `${serverUrl}/slow`,
      method: HttpMethod.GET,
      headers: {},
      timeout: 1000, // 1 second timeout
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });
  
  it('should handle circuit breaker opening', async () => {
    // Force circuit breaker to open by making multiple failing requests
    const failingUrl = `${serverUrl}/always-fail`;
    mockServer.setRoute('/always-fail', (req: any, res: any) => {
      res.status(500).json({ error: 'Always fails' });
    });
    
    // Make requests until circuit opens
    for (let i = 0; i < 10; i++) {
      await apiTester.executeRequest({
        url: failingUrl,
        method: HttpMethod.GET,
        headers: {},
      }, { maxRetries: 0 });
    }
    
    // Next request should fail immediately due to open circuit
    const start = Date.now();
    const result = await apiTester.executeRequest({
      url: failingUrl,
      method: HttpMethod.GET,
      headers: {},
    }, { maxRetries: 0 });
    const duration = Date.now() - start;
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('Circuit breaker is OPEN');
    expect(duration).toBeLessThan(100); // Should fail fast
  });
});