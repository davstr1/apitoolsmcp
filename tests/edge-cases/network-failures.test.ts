import { ApiTester } from '../../src/services/api-tester';
import { HttpMethod } from '../../src/types/http';
import * as nock from 'nock';

describe('Edge Cases: Network Failures', () => {
  let apiTester: ApiTester;
  
  beforeEach(() => {
    apiTester = new ApiTester();
    nock.cleanAll();
  });
  
  afterEach(() => {
    nock.cleanAll();
  });
  
  it('should handle DNS lookup failures', async () => {
    const result = await apiTester.executeRequest({
      url: 'https://non-existent-domain-12345.com/api',
      method: HttpMethod.GET,
      headers: {},
    }, { maxRetries: 0 });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('ENOTFOUND');
  });
  
  it('should handle connection refused', async () => {
    // Use a port that's likely not in use
    const result = await apiTester.executeRequest({
      url: 'http://localhost:65535/api',
      method: HttpMethod.GET,
      headers: {},
    }, { maxRetries: 0 });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('ECONNREFUSED');
  });
  
  it('should handle network timeouts', async () => {
    nock('https://api.example.com')
      .get('/timeout')
      .delayConnection(2000)
      .reply(200, { data: 'delayed' });
    
    const result = await apiTester.executeRequest({
      url: 'https://api.example.com/timeout',
      method: HttpMethod.GET,
      headers: {},
      timeout: 1000,
    }, { maxRetries: 0 });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('timeout');
  });
  
  it('should handle abrupt connection close', async () => {
    nock('https://api.example.com')
      .get('/close')
      .replyWithError({ code: 'ECONNRESET' });
    
    const result = await apiTester.executeRequest({
      url: 'https://api.example.com/close',
      method: HttpMethod.GET,
      headers: {},
    }, { maxRetries: 0 });
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('ECONNRESET');
  });
  
  it('should handle SSL certificate errors', async () => {
    // This would test against a server with invalid SSL cert
    // For unit tests, we mock the behavior
    nock('https://api.example.com')
      .get('/ssl-error')
      .replyWithError({ code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' });
    
    const result = await apiTester.executeRequest({
      url: 'https://api.example.com/ssl-error',
      method: HttpMethod.GET,
      headers: {},
    }, { maxRetries: 0 });
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});