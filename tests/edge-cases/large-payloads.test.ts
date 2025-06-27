import { ApiTester } from '../../src/services/api-tester';
import { HttpMethod } from '../../src/types/http';
import { ResponseAnalyzer } from '../../src/services/response-analyzer';
import * as nock from 'nock';
import fetch from 'node-fetch';

describe('Edge Cases: Large Payloads', () => {
  let apiTester: ApiTester;
  let analyzer: ResponseAnalyzer;
  
  beforeEach(() => {
    apiTester = new ApiTester();
    analyzer = new ResponseAnalyzer();
    nock.cleanAll();
  });
  
  afterEach(() => {
    nock.cleanAll();
  });
  
  it('should handle large JSON arrays', async () => {
    // Create 1MB of JSON data
    const largeArray = Array(10000).fill({
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      description: 'A'.repeat(50),
    });
    
    nock('https://api.example.com')
      .get('/large-array')
      .reply(200, largeArray);
    
    const result = await apiTester.executeRequest({
      url: 'https://api.example.com/large-array',
      method: HttpMethod.GET,
      headers: {},
    });
    
    expect(result.success).toBe(true);
    expect(Array.isArray(result.response.body)).toBe(true);
    expect(result.response.body.length).toBe(10000);
  });
  
  it('should handle large POST request bodies', async () => {
    // Create 500KB of data
    const largeBody = {
      data: Array(5000).fill({
        field1: 'value1',
        field2: 'value2',
        field3: 'A'.repeat(20),
      }),
    };
    
    nock('https://api.example.com')
      .post('/large-post', body => {
        return body.data && Array.isArray(body.data) && body.data.length === 5000;
      })
      .reply(201, { id: 123, status: 'created' });
    
    const result = await apiTester.executeRequest({
      url: 'https://api.example.com/large-post',
      method: HttpMethod.POST,
      headers: {
        'Content-Type': 'application/json',
      },
      body: largeBody,
    });
    
    expect(result.success).toBe(true);
    expect(result.response.status).toBe(201);
  });
  
  it('should handle streaming responses', async () => {
    // Simulate a large streaming response
    const chunks = Array(100).fill('data chunk\n');
    
    nock('https://api.example.com')
      .get('/stream')
      .reply(200, chunks.join(''), {
        'Content-Type': 'text/plain',
        'Transfer-Encoding': 'chunked',
      });
    
    const result = await apiTester.executeRequest({
      url: 'https://api.example.com/stream',
      method: HttpMethod.GET,
      headers: {},
    });
    
    expect(result.success).toBe(true);
    expect(result.response.body).toContain('data chunk');
  });
  
  it('should handle compressed responses', async () => {
    // Mock gzipped response
    const data = { message: 'This is compressed data' };
    
    nock('https://api.example.com')
      .get('/gzipped')
      .reply(200, data, {
        'Content-Encoding': 'gzip',
        'Content-Type': 'application/json',
      });
    
    const result = await apiTester.executeRequest({
      url: 'https://api.example.com/gzipped',
      method: HttpMethod.GET,
      headers: {
        'Accept-Encoding': 'gzip, deflate',
      },
    });
    
    expect(result.success).toBe(true);
    expect(result.response.body).toEqual(data);
  });
  
  it('should handle multipart form data responses', async () => {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const multipartData = [
      `------${boundary}`,
      'Content-Disposition: form-data; name="field1"',
      '',
      'value1',
      `------${boundary}`,
      'Content-Disposition: form-data; name="field2"',
      '',
      'value2',
      `------${boundary}--`,
    ].join('\r\n');
    
    nock('https://api.example.com')
      .get('/multipart')
      .reply(200, multipartData, {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      });
    
    const response = await fetch('https://api.example.com/multipart');
    const analysis = await analyzer.analyze(response);
    
    expect(analysis.contentType).toContain('multipart/form-data');
    expect(analysis.dataType).toBe('text');
  });
  
  it('should handle memory efficiently with very large responses', async () => {
    // Create a 10MB response
    const veryLargeData = 'x'.repeat(10 * 1024 * 1024);
    
    nock('https://api.example.com')
      .get('/very-large')
      .reply(200, veryLargeData, {
        'Content-Type': 'text/plain',
        'Content-Length': String(veryLargeData.length),
      });
    
    const memoryBefore = process.memoryUsage().heapUsed;
    
    const result = await apiTester.executeRequest({
      url: 'https://api.example.com/very-large',
      method: HttpMethod.GET,
      headers: {},
    });
    
    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryIncrease = memoryAfter - memoryBefore;
    
    expect(result.success).toBe(true);
    expect(result.response.body.length).toBe(10 * 1024 * 1024);
    // Memory increase should be reasonable (not multiple times the data size)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
  });
  
  it('should handle chunked transfer encoding', async () => {
    nock('https://api.example.com')
      .get('/chunked')
      .reply(200, function() {
        // Simulate chunked response
        return JSON.stringify({
          data: Array(1000).fill({ value: 'chunk' }),
        });
      }, {
        'Transfer-Encoding': 'chunked',
        'Content-Type': 'application/json',
      });
    
    const result = await apiTester.executeRequest({
      url: 'https://api.example.com/chunked',
      method: HttpMethod.GET,
      headers: {},
    });
    
    expect(result.success).toBe(true);
    expect(result.response.body.data).toHaveLength(1000);
  });
});