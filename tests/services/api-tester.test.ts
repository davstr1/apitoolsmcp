import { ApiTester } from '../../src/services/api-tester';
import fetch from 'node-fetch';
import * as https from 'https';
import { HttpMethod } from '../../src/types/http';

jest.mock('node-fetch');

describe('ApiTester', () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
  let tester: ApiTester;

  beforeEach(() => {
    jest.clearAllMocks();
    tester = new ApiTester();
  });

  describe('executeRequest', () => {
    it('should execute successful GET request', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          raw: () => ({
            'content-type': ['application/json'],
            'x-custom': ['value'],
          }),
        },
        json: async () => ({ data: 'test' }),
        text: async () => '{"data":"test"}',
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const startTime = Date.now();
      const result = await tester.executeRequest({
        url: 'https://api.test.com/users',
        method: HttpMethod.GET,
        headers: { 'Authorization': 'Bearer token' },
      });

      expect(mockFetch).toHaveBeenCalledWith('https://api.test.com/users', {
        method: 'GET',
        headers: { 'Authorization': 'Bearer token' },
        timeout: 30000,
      });

      expect(result.success).toBe(true);
      expect(result.response.status).toBe(200);
      expect(result.response.statusText).toBe('OK');
      expect(result.response.headers['content-type']).toBe('application/json');
      expect(result.response.body).toEqual({ data: 'test' });
      expect(result.response.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeDefined();
    });

    it('should execute POST request with body', async () => {
      const requestBody = { name: 'Test User', email: 'test@example.com' };
      const mockResponse = {
        ok: true,
        status: 201,
        statusText: 'Created',
        headers: {
          raw: () => ({
            'content-type': ['application/json'],
          }),
        },
        json: async () => ({ id: 1, ...requestBody }),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await tester.executeRequest({
        url: 'https://api.test.com/users',
        method: HttpMethod.POST,
        headers: { 'Content-Type': 'application/json' },
        body: requestBody,
      });

      expect(mockFetch).toHaveBeenCalledWith('https://api.test.com/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        timeout: 30000,
      });

      expect(result.success).toBe(true);
      expect(result.response.status).toBe(201);
    });

    it('should handle query parameters', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { raw: () => ({}) },
        json: async () => ({}),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await tester.executeRequest({
        url: 'https://api.test.com/users',
        method: HttpMethod.GET,
        headers: {},
        params: { page: '1', limit: '10' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users?page=1&limit=10',
        expect.any(Object)
      );
    });

    it('should handle non-JSON responses', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          raw: () => ({
            'content-type': ['text/html'],
          }),
        },
        text: async () => '<html><body>Hello</body></html>',
        json: async () => { throw new Error('Not JSON'); },
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await tester.executeRequest({
        url: 'https://api.test.com/page',
        method: HttpMethod.GET,
        headers: {},
      });

      expect(result.success).toBe(true);
      expect(result.response.body).toBe('<html><body>Hello</body></html>');
    });

    it('should handle HTTP errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: {
          raw: () => ({
            'content-type': ['application/json'],
          }),
        },
        json: async () => ({ error: 'Not found' }),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await tester.executeRequest({
        url: 'https://api.test.com/missing',
        method: HttpMethod.GET,
        headers: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('HTTP 404: Not Found');
      expect(result.response.status).toBe(404);
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await tester.executeRequest({
        url: 'https://api.test.com/users',
        method: HttpMethod.GET,
        headers: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });

    it('should handle timeout', async () => {
      const mockResponse = new Promise((resolve) => {
        setTimeout(() => resolve({
          ok: true,
          status: 200,
        }), 5000);
      });

      mockFetch.mockReturnValue(mockResponse as any);

      const result = await tester.executeRequest({
        url: 'https://api.test.com/slow',
        method: HttpMethod.GET,
        headers: {},
        timeout: 100, // 100ms timeout
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should use custom timeout', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { raw: () => ({}) },
        json: async () => ({}),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await tester.executeRequest({
        url: 'https://api.test.com/users',
        method: HttpMethod.GET,
        headers: {},
        timeout: 60000,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/users',
        expect.objectContaining({ timeout: 60000 })
      );
    });

    it('should preserve exact headers without modification', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: { raw: () => ({}) },
        json: async () => ({}),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const customHeaders = {
        'X-Custom-Header': 'custom-value',
        'Authorization': 'Bearer token',
        'X-Api-Key': 'key123',
      };

      await tester.executeRequest({
        url: 'https://api.test.com/test',
        method: HttpMethod.GET,
        headers: customHeaders,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/test',
        expect.objectContaining({
          headers: customHeaders, // Exact headers, no additions
        })
      );
    });

    it('should handle empty response body', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: { raw: () => ({}) },
        text: async () => '',
        json: async () => { throw new Error('No content'); },
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await tester.executeRequest({
        url: 'https://api.test.com/delete',
        method: HttpMethod.DELETE,
        headers: {},
      });

      expect(result.success).toBe(true);
      expect(result.response.status).toBe(204);
      expect(result.response.body).toBe('');
    });
  });

  describe('executeRawRequest', () => {
    it('should execute request using native https module', async () => {
      // This would require more complex mocking of https module
      // For now, we'll test that the method exists
      expect(tester.executeRawRequest).toBeDefined();
    });
  });
});