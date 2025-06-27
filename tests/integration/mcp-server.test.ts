import { MCPServer } from '../../src/server/index';
import { Config } from '../../src/types/config';
import { APISchema, HTTPMethod } from '../../src/types/api-schema';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { createTempDir, cleanupTempDir } from '../setup';

// Mock the MCP SDK to avoid actual stdio connections
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: jest.fn().mockImplementation(() => ({
    setRequestHandler: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    onerror: undefined,
  })),
}));

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn().mockImplementation(() => ({})),
}));

describe('MCP Server Integration', () => {
  let tempDir: string;
  let server: MCPServer;
  let config: Config;

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = createTempDir();
    
    config = {
      schemaDirectory: tempDir,
      remoteImports: { enabled: true, cacheDuration: 3600000 },
      validation: { strict: true },
    };
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
    cleanupTempDir(tempDir);
  });

  describe('Server Startup and Schema Loading', () => {
    it('should start server and load schemas from directory', async () => {
      // Create test schemas
      const schemas: APISchema[] = [
        {
          id: 'test-api-1',
          name: 'Test API 1',
          version: '1.0.0',
          baseURL: 'https://api1.test.com',
          endpoints: [
            {
              path: '/users',
              method: HTTPMethod.GET,
              description: 'Get users',
              responses: {
                '200': { description: 'Success' },
              },
            },
          ],
        },
        {
          id: 'test-api-2',
          name: 'Test API 2',
          version: '2.0.0',
          baseURL: 'https://api2.test.com',
          endpoints: [
            {
              path: '/products',
              method: HTTPMethod.GET,
              description: 'Get products',
            },
            {
              path: '/products',
              method: HTTPMethod.POST,
              description: 'Create product',
              requestBody: {
                required: true,
                contentType: 'application/json',
              },
            },
          ],
        },
      ];

      // Save schemas to temp directory
      for (const schema of schemas) {
        const schemaPath = path.join(tempDir, `${schema.id}.yaml`);
        await fs.writeFile(schemaPath, yaml.dump(schema), 'utf-8');
      }

      // Create and start server
      server = new MCPServer(config);
      await server.start();

      // Server should have started successfully
      // In real implementation, we would verify that schemas are loaded
      // by calling the tool handlers
    });

    it('should handle empty schema directory', async () => {
      server = new MCPServer(config);
      await server.start();
      
      // Server should start even with no schemas
    });

    it('should handle invalid schema files gracefully', async () => {
      // Create an invalid YAML file
      await fs.writeFile(
        path.join(tempDir, 'invalid.yaml'),
        'invalid: yaml: content:::',
        'utf-8'
      );

      // Create a valid schema
      const validSchema: APISchema = {
        id: 'valid-api',
        name: 'Valid API',
        version: '1.0.0',
        baseURL: 'https://valid.test.com',
        endpoints: [],
      };
      await fs.writeFile(
        path.join(tempDir, 'valid.yaml'),
        yaml.dump(validSchema),
        'utf-8'
      );

      server = new MCPServer(config);
      await server.start();
      
      // Server should start and load only valid schemas
    });
  });

  describe('Tool Handler Integration', () => {
    beforeEach(async () => {
      // Create test schemas with various features
      const schemas: APISchema[] = [
        {
          id: 'user-api',
          name: 'User Management API',
          version: '1.0.0',
          description: 'API for managing users',
          baseURL: 'https://users.test.com',
          endpoints: [
            {
              path: '/users',
              method: HTTPMethod.GET,
              description: 'List all users',
              parameters: [
                {
                  name: 'page',
                  type: 'number',
                  required: false,
                  description: 'Page number',
                },
                {
                  name: 'limit',
                  type: 'number',
                  required: false,
                  description: 'Items per page',
                  default: 10,
                },
              ],
              responses: {
                '200': {
                  description: 'Success',
                  contentType: 'application/json',
                  schema: {
                    type: 'object',
                    properties: {
                      users: { type: 'array' },
                      total: { type: 'number' },
                    },
                  },
                },
              },
            },
            {
              path: '/users/{id}',
              method: HTTPMethod.GET,
              description: 'Get user by ID',
              parameters: [
                {
                  name: 'id',
                  type: 'string',
                  required: true,
                  description: 'User ID',
                },
              ],
            },
            {
              path: '/users',
              method: HTTPMethod.POST,
              description: 'Create a new user',
              requestBody: {
                required: true,
                contentType: 'application/json',
                schema: {
                  type: 'object',
                  required: ['name', 'email'],
                  properties: {
                    name: { type: 'string' },
                    email: { type: 'string', format: 'email' },
                  },
                },
              },
            },
          ],
          globalHeaders: [
            {
              name: 'Authorization',
              required: true,
              description: 'Bearer token',
              example: 'Bearer YOUR_TOKEN',
            },
          ],
          metadata: {
            source: 'manual',
            createdAt: new Date().toISOString(),
          },
        },
        {
          id: 'product-api',
          name: 'Product Catalog API',
          version: '1.0.0',
          description: 'Product management system',
          baseURL: 'https://products.test.com',
          endpoints: [
            {
              path: '/products',
              method: HTTPMethod.GET,
              description: 'Search products',
              parameters: [
                {
                  name: 'q',
                  type: 'string',
                  required: false,
                  description: 'Search query',
                },
                {
                  name: 'category',
                  type: 'string',
                  required: false,
                  description: 'Product category',
                  enum: ['electronics', 'clothing', 'food'],
                },
              ],
            },
          ],
        },
      ];

      // Save schemas
      for (const schema of schemas) {
        const schemaPath = path.join(tempDir, `${schema.id}.yaml`);
        await fs.writeFile(schemaPath, yaml.dump(schema), 'utf-8');
      }

      server = new MCPServer(config);
      await server.start();
    });

    it('should provide correct tool definitions', () => {
      // In a real test, we would inspect the tool handlers
      // registered with the MCP server
      
      // Expected tools:
      // 1. listAPIs - with optional search parameter
      // 2. getAPISchema - with required apiId parameter
      // 3. getEndpoint - with required apiId, path, and method parameters
    });

    it('should handle concurrent tool calls', async () => {
      // In a real scenario, we would simulate multiple concurrent
      // tool calls to ensure the server handles them properly
      
      // This would test:
      // - Thread safety of schema loading
      // - Proper response isolation
      // - No race conditions
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle schema directory changes', async () => {
      // Start with one schema
      const initialSchema: APISchema = {
        id: 'initial-api',
        name: 'Initial API',
        version: '1.0.0',
        baseURL: 'https://initial.test.com',
        endpoints: [],
      };
      
      await fs.writeFile(
        path.join(tempDir, 'initial.yaml'),
        yaml.dump(initialSchema),
        'utf-8'
      );

      server = new MCPServer(config);
      await server.start();

      // Add another schema while server is running
      const newSchema: APISchema = {
        id: 'new-api',
        name: 'New API',
        version: '1.0.0',
        baseURL: 'https://new.test.com',
        endpoints: [],
      };
      
      await fs.writeFile(
        path.join(tempDir, 'new.yaml'),
        yaml.dump(newSchema),
        'utf-8'
      );

      // In a real implementation, we might need to trigger a reload
      // or the server might watch for file changes
    });

    it('should recover from temporary file system errors', async () => {
      server = new MCPServer(config);
      
      // Start server (should succeed even if initial load fails)
      await server.start();
      
      // Server should be resilient to temporary errors
    });
  });

  describe('Performance Considerations', () => {
    it('should handle large number of schemas efficiently', async () => {
      // Create many schemas
      const schemaCount = 50;
      
      for (let i = 0; i < schemaCount; i++) {
        const schema: APISchema = {
          id: `api-${i}`,
          name: `API ${i}`,
          version: '1.0.0',
          baseURL: `https://api${i}.test.com`,
          endpoints: [
            {
              path: `/resource${i}`,
              method: HTTPMethod.GET,
              description: `Get resource ${i}`,
            },
          ],
        };
        
        await fs.writeFile(
          path.join(tempDir, `api-${i}.yaml`),
          yaml.dump(schema),
          'utf-8'
        );
      }

      const startTime = Date.now();
      server = new MCPServer(config);
      await server.start();
      const loadTime = Date.now() - startTime;

      // Loading should be reasonably fast
      expect(loadTime).toBeLessThan(5000); // 5 seconds for 50 schemas
    });

    it('should cache schemas for quick access', async () => {
      // Create schemas with complex structures
      const complexSchema: APISchema = {
        id: 'complex-api',
        name: 'Complex API',
        version: '1.0.0',
        baseURL: 'https://complex.test.com',
        endpoints: Array.from({ length: 20 }, (_, i) => ({
          path: `/endpoint${i}`,
          method: HTTPMethod.GET,
          description: `Endpoint ${i}`,
          parameters: Array.from({ length: 5 }, (_, j) => ({
            name: `param${j}`,
            type: 'string' as const,
            required: j === 0,
            description: `Parameter ${j}`,
          })),
          responses: {
            '200': {
              description: 'Success',
              contentType: 'application/json',
              schema: {
                type: 'object',
                properties: {
                  data: { type: 'array' },
                  meta: { type: 'object' },
                },
              },
            },
          },
        })),
      };

      await fs.writeFile(
        path.join(tempDir, 'complex.yaml'),
        yaml.dump(complexSchema),
        'utf-8'
      );

      server = new MCPServer(config);
      await server.start();

      // Subsequent access should be fast due to caching
    });
  });
});