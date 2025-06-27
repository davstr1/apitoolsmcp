import { SchemaGenerator } from '../../src/services/schema-generator';
import { HTTPMethod } from '../../src/types/api-schema';
import { HttpMethod, ApiTestResult } from '../../src/types/http';

describe('SchemaGenerator', () => {
  let generator: SchemaGenerator;

  beforeEach(() => {
    generator = new SchemaGenerator();
  });

  describe('generate', () => {
    it('should generate schema from successful test result', async () => {
      const options = {
        apiInfo: {
          id: 'test-api',
          name: 'Test API',
          description: 'Test API description',
        },
        baseUrl: 'https://api.test.com',
        path: '/users',
        method: HttpMethod.GET,
        headers: {
          'Authorization': 'Bearer token123',
          'Content-Type': 'application/json',
        },
        parameters: [
          {
            name: 'page',
            value: '1',
            type: 'number' as const,
            required: false,
            location: 'query' as const,
            description: 'Page number',
            default: 1,
          },
        ],
        testResult: {
          request: {
            url: 'https://api.test.com/users?page=1',
            method: HttpMethod.GET,
            headers: { 'Authorization': 'Bearer token123' },
          },
          response: {
            status: 200,
            statusText: 'OK',
            headers: { 'content-type': 'application/json' },
            body: { users: [], total: 0 },
            responseTime: 150,
          },
          timestamp: '2024-01-01T00:00:00Z',
          success: true,
        } as ApiTestResult,
        analysis: {
          contentType: 'application/json',
          structure: {
            type: 'object',
            properties: {
              users: { type: 'array', items: {} },
              total: { type: 'number' },
            },
          },
          examples: [{ users: [], total: 0 }],
        } as any,
      };

      const schema = await generator.generate(options);

      expect(schema.id).toBe('test-api');
      expect(schema.name).toBe('Test API');
      expect(schema.description).toBe('Test API description');
      expect(schema.baseURL).toBe('https://api.test.com');
      expect(schema.endpoints).toHaveLength(1);
      
      const endpoint = schema.endpoints[0];
      expect(endpoint.path).toBe('/users');
      expect(endpoint.method).toBe(HTTPMethod.GET);
      expect(endpoint.parameters).toHaveLength(1);
      expect(endpoint.parameters![0].name).toBe('page');
      expect(endpoint.parameters![0].type).toBe('number');
      
      expect(endpoint.responses).toBeDefined();
      expect(endpoint.responses!['200']).toBeDefined();
      expect(endpoint.responses!['200'].description).toBe('OK');
      expect(endpoint.responses!['200'].contentType).toBe('application/json');
      expect(endpoint.responses!['200'].schema).toBeDefined();
      expect(endpoint.responses!['200'].example).toEqual({ users: [], total: 0 });
      
      expect(schema.globalHeaders).toHaveLength(1);
      expect(schema.globalHeaders![0].name).toBe('Authorization');
      expect(schema.globalHeaders![0].required).toBe(true);
      
      expect(schema.metadata).toBeDefined();
      expect(schema.metadata!.source).toBe('tested');
      expect(schema.metadata!.testResults).toHaveLength(1);
      expect(schema.metadata!.testResults![0].statusCode).toBe(200);
      expect(schema.metadata!.testResults![0].success).toBe(true);
    });

    it('should extract authentication headers', async () => {
      const options = {
        apiInfo: { id: 'auth-api', name: 'Auth API' },
        baseUrl: 'https://api.test.com',
        path: '/data',
        method: HttpMethod.GET,
        headers: {
          'Authorization': 'Bearer token',
          'X-API-Key': 'key123',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        parameters: [],
      };

      const schema = await generator.generateBasic(options);

      expect(schema.globalHeaders).toHaveLength(2);
      const authHeaders = schema.globalHeaders!.map(h => h.name);
      expect(authHeaders).toContain('Authorization');
      expect(authHeaders).toContain('X-API-Key');
      expect(authHeaders).not.toContain('Content-Type');
      expect(authHeaders).not.toContain('Accept');
    });

    it('should handle POST request with body', async () => {
      const options = {
        apiInfo: { id: 'post-api', name: 'POST API' },
        baseUrl: 'https://api.test.com',
        path: '/users',
        method: HttpMethod.POST,
        headers: { 'Content-Type': 'application/json' },
        parameters: [
          {
            name: 'user',
            type: 'object' as const,
            required: true,
            location: 'body' as const,
            example: { name: 'John', email: 'john@example.com' },
          },
        ],
      };

      const schema = await generator.generateBasic(options);
      const endpoint = schema.endpoints[0];

      expect(endpoint.method).toBe(HTTPMethod.POST);
      expect(endpoint.requestBody).toBeDefined();
      expect(endpoint.requestBody!.required).toBe(true);
      expect(endpoint.requestBody!.contentType).toBe('application/json');
      expect(endpoint.requestBody!.example).toEqual({ name: 'John', email: 'john@example.com' });
    });

    it('should handle path parameters', async () => {
      const options = {
        apiInfo: { id: 'path-api', name: 'Path API' },
        baseUrl: 'https://api.test.com',
        path: '/users/{id}',
        method: HttpMethod.GET,
        headers: {},
        parameters: [
          {
            name: 'id',
            type: 'string' as const,
            required: true,
            location: 'path' as const,
            description: 'User ID',
            example: '123',
          },
        ],
      };

      const schema = await generator.generateBasic(options);
      const endpoint = schema.endpoints[0];

      expect(endpoint.parameters).toHaveLength(1);
      expect(endpoint.parameters![0].name).toBe('id');
      expect(endpoint.parameters![0].required).toBe(true);
      expect(endpoint.parameters![0].example).toBe('123');
    });

    it('should generate multiple response codes', async () => {
      const options = {
        apiInfo: { id: 'multi-response', name: 'Multi Response API' },
        baseUrl: 'https://api.test.com',
        path: '/resource',
        method: HttpMethod.GET,
        headers: {},
        parameters: [],
        testResult: {
          success: true,
          response: {
            status: 200,
            statusText: 'OK',
            headers: { 'content-type': 'application/json' },
            body: { data: 'test' },
            responseTime: 100,
          },
        } as any,
        analysis: {
          contentType: 'application/json',
          structure: { type: 'object', properties: { data: { type: 'string' } } },
          examples: [{ data: 'test' }],
        } as any,
      };

      const schema = await generator.generate(options);
      const responses = schema.endpoints[0].responses!;

      expect(responses['200']).toBeDefined();
      expect(responses['400']).toBeDefined();
      expect(responses['401']).toBeDefined();
      expect(responses['404']).toBeDefined();
      expect(responses['500']).toBeDefined();
    });

    it('should handle header parameters', async () => {
      const options = {
        apiInfo: { id: 'header-api', name: 'Header API' },
        baseUrl: 'https://api.test.com',
        path: '/data',
        method: HttpMethod.GET,
        headers: {
          'X-Custom-Header': 'custom-value',
          'X-Request-ID': 'req-123',
        },
        parameters: [
          {
            name: 'X-User-ID',
            type: 'string' as const,
            required: true,
            location: 'header' as const,
            description: 'User identifier',
            example: 'user-456',
          },
        ],
      };

      const schema = await generator.generateBasic(options);
      const endpoint = schema.endpoints[0];

      expect(endpoint.headers).toBeDefined();
      expect(endpoint.headers!.length).toBeGreaterThanOrEqual(3);
      
      const headerNames = endpoint.headers!.map(h => h.name);
      expect(headerNames).toContain('X-Custom-Header');
      expect(headerNames).toContain('X-Request-ID');
      expect(headerNames).toContain('X-User-ID');
    });

    it('should preserve metadata timestamps', async () => {
      const now = new Date();
      const options = {
        apiInfo: { id: 'meta-api', name: 'Meta API' },
        baseUrl: 'https://api.test.com',
        path: '/test',
        method: HttpMethod.GET,
        headers: {},
        parameters: [],
        testResult: {
          success: true,
          response: {
            status: 200,
            statusText: 'OK',
            headers: {},
            body: {},
            responseTime: 50,
          },
          timestamp: now.toISOString(),
        } as any,
      };

      const schema = await generator.generate(options);

      expect(schema.metadata!.createdAt).toBeDefined();
      expect(schema.metadata!.lastTestedAt).toBeDefined();
      expect(schema.metadata!.testResults![0].timestamp).toBeDefined();
      
      // Timestamps should be recent (within last minute)
      const created = new Date(schema.metadata!.createdAt!);
      expect(now.getTime() - created.getTime()).toBeLessThan(60000);
    });

    it('should handle empty responses', async () => {
      const options = {
        apiInfo: { id: 'empty-api', name: 'Empty API' },
        baseUrl: 'https://api.test.com',
        path: '/delete',
        method: HttpMethod.DELETE,
        headers: {},
        parameters: [],
      };

      const schema = await generator.generateBasic(options);
      const endpoint = schema.endpoints[0];

      expect(endpoint.responses).toBeDefined();
      expect(endpoint.responses!['200']).toBeDefined();
      expect(endpoint.responses!['200'].description).toBe('Successful response');
    });
  });

  describe('generateBasic', () => {
    it('should generate basic schema without test results', async () => {
      const options = {
        apiInfo: {
          id: 'basic-api',
          name: 'Basic API',
          description: 'Basic API without tests',
        },
        baseUrl: 'https://api.basic.com',
        path: '/endpoint',
        method: HttpMethod.GET,
        headers: {},
        parameters: [],
      };

      const schema = await generator.generateBasic(options);

      expect(schema.id).toBe('basic-api');
      expect(schema.name).toBe('Basic API');
      expect(schema.version).toBe('1.0.0');
      expect(schema.endpoints).toHaveLength(1);
      expect(schema.metadata!.source).toBe('manual');
      expect(schema.metadata!.testResults).toBeUndefined();
      
      // Should have generic responses
      const responses = schema.endpoints[0].responses!;
      expect(responses['200']).toBeDefined();
      expect(responses['400']).toBeDefined();
      expect(responses['401']).toBeDefined();
      expect(responses['500']).toBeDefined();
    });
  });
});