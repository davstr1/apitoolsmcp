import { MCPServer } from '../../src/server/index';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SchemaProvider } from '../../src/server/schema-provider';
import { Config } from '../../src/types/config';
import { APISchema, HTTPMethod } from '../../src/types/api-schema';

jest.mock('@modelcontextprotocol/sdk/server/index.js');
jest.mock('@modelcontextprotocol/sdk/server/stdio.js');
jest.mock('../../src/server/schema-provider');

describe('MCPServer', () => {
  const mockServer = Server as jest.MockedClass<typeof Server>;
  const mockTransport = StdioServerTransport as jest.MockedClass<typeof StdioServerTransport>;
  const mockSchemaProvider = SchemaProvider as jest.MockedClass<typeof SchemaProvider>;
  
  let mcpServer: MCPServer;
  let mockServerInstance: any;
  let mockTransportInstance: any;
  let mockSchemaProviderInstance: any;
  let config: Config;

  beforeEach(() => {
    jest.clearAllMocks();
    
    config = {
      schemaDirectory: '/test/schemas',
      remoteImports: { enabled: true, cacheDuration: 3600000 },
      validation: { strict: true },
    };

    // Mock server instance
    mockServerInstance = {
      setRequestHandler: jest.fn(),
      connect: jest.fn(),
      close: jest.fn(),
      onerror: undefined,
    };
    mockServer.mockImplementation(() => mockServerInstance);

    // Mock transport instance
    mockTransportInstance = {};
    mockTransport.mockImplementation(() => mockTransportInstance);

    // Mock schema provider instance
    mockSchemaProviderInstance = {
      loadSchemas: jest.fn(),
      getSchemaCount: jest.fn().mockReturnValue(3),
      listSchemas: jest.fn(),
      searchSchemas: jest.fn(),
      getSchema: jest.fn(),
    };
    mockSchemaProvider.mockImplementation(() => mockSchemaProviderInstance);

    mcpServer = new MCPServer(config);
  });

  describe('constructor', () => {
    it('should initialize server with correct configuration', () => {
      expect(mockServer).toHaveBeenCalledWith(
        {
          name: 'api-tools-mcp',
          version: '0.3.0',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );
      expect(mockSchemaProvider).toHaveBeenCalledWith(config);
      expect(mockTransport).toHaveBeenCalled();
    });

    it('should setup request handlers', () => {
      expect(mockServerInstance.setRequestHandler).toHaveBeenCalledTimes(2);
      
      // Check that handlers were set for ListToolsRequest and CallToolRequest
      const calls = mockServerInstance.setRequestHandler.mock.calls;
      expect(calls[0][0]).toBeDefined(); // ListToolsRequestSchema
      expect(calls[1][0]).toBeDefined(); // CallToolRequestSchema
    });
  });

  describe('listTools handler', () => {
    it('should return available tools', async () => {
      const handler = mockServerInstance.setRequestHandler.mock.calls[0][1];
      const result = await handler({});

      expect(result.tools).toHaveLength(3);
      
      const toolNames = result.tools.map((t: any) => t.name);
      expect(toolNames).toContain('listAPIs');
      expect(toolNames).toContain('getAPISchema');
      expect(toolNames).toContain('getEndpoint');

      // Check tool schemas
      const listAPIsTool = result.tools.find((t: any) => t.name === 'listAPIs');
      expect(listAPIsTool.inputSchema.properties).toHaveProperty('search');
      
      const getAPITool = result.tools.find((t: any) => t.name === 'getAPISchema');
      expect(getAPITool.inputSchema.required).toContain('apiId');
      
      const getEndpointTool = result.tools.find((t: any) => t.name === 'getEndpoint');
      expect(getEndpointTool.inputSchema.required).toContain('apiId');
      expect(getEndpointTool.inputSchema.required).toContain('path');
      expect(getEndpointTool.inputSchema.required).toContain('method');
    });
  });

  describe('callTool handler', () => {
    let handler: any;

    beforeEach(() => {
      handler = mockServerInstance.setRequestHandler.mock.calls[1][1];
    });

    describe('listAPIs tool', () => {
      it('should list all APIs without search', async () => {
        const mockSchemas: APISchema[] = [
          {
            id: 'api1',
            name: 'API 1',
            version: '1.0.0',
            baseURL: 'https://api1.test.com',
            endpoints: [],
          },
          {
            id: 'api2',
            name: 'API 2',
            version: '2.0.0',
            description: 'Second API',
            baseURL: 'https://api2.test.com',
            endpoints: [{ path: '/test', method: HTTPMethod.GET }],
          },
        ];

        mockSchemaProviderInstance.listSchemas.mockReturnValue(mockSchemas);

        const result = await handler({
          params: { name: 'listAPIs', arguments: {} },
        });

        expect(mockSchemaProviderInstance.listSchemas).toHaveBeenCalled();
        expect(mockSchemaProviderInstance.searchSchemas).not.toHaveBeenCalled();
        
        const content = JSON.parse(result.content[0].text);
        expect(content).toHaveLength(2);
        expect(content[0].id).toBe('api1');
        expect(content[0].endpointCount).toBe(0);
        expect(content[1].id).toBe('api2');
        expect(content[1].endpointCount).toBe(1);
      });

      it('should search APIs when search parameter provided', async () => {
        const mockSchemas: APISchema[] = [
          {
            id: 'user-api',
            name: 'User API',
            version: '1.0.0',
            baseURL: 'https://api.test.com',
            endpoints: [],
          },
        ];

        mockSchemaProviderInstance.searchSchemas.mockReturnValue(mockSchemas);

        const result = await handler({
          params: {
            name: 'listAPIs',
            arguments: { search: 'user' },
          },
        });

        expect(mockSchemaProviderInstance.searchSchemas).toHaveBeenCalledWith('user');
        expect(mockSchemaProviderInstance.listSchemas).not.toHaveBeenCalled();
        
        const content = JSON.parse(result.content[0].text);
        expect(content).toHaveLength(1);
        expect(content[0].name).toBe('User API');
      });
    });

    describe('getAPISchema tool', () => {
      it('should return full schema for valid API ID', async () => {
        const mockSchema: APISchema = {
          id: 'test-api',
          name: 'Test API',
          version: '1.0.0',
          baseURL: 'https://api.test.com',
          endpoints: [
            {
              path: '/users',
              method: HTTPMethod.GET,
              description: 'Get users',
            },
          ],
        };

        mockSchemaProviderInstance.getSchema.mockReturnValue(mockSchema);

        const result = await handler({
          params: {
            name: 'getAPISchema',
            arguments: { apiId: 'test-api' },
          },
        });

        expect(mockSchemaProviderInstance.getSchema).toHaveBeenCalledWith('test-api');
        
        const content = JSON.parse(result.content[0].text);
        expect(content).toEqual(mockSchema);
      });

      it('should return error message for non-existent API', async () => {
        mockSchemaProviderInstance.getSchema.mockReturnValue(null);

        const result = await handler({
          params: {
            name: 'getAPISchema',
            arguments: { apiId: 'non-existent' },
          },
        });

        expect(result.content[0].text).toContain("API schema with ID 'non-existent' not found");
      });
    });

    describe('getEndpoint tool', () => {
      it('should return endpoint details', async () => {
        const mockSchema: APISchema = {
          id: 'test-api',
          name: 'Test API',
          version: '1.0.0',
          baseURL: 'https://api.test.com',
          endpoints: [
            {
              path: '/users',
              method: HTTPMethod.GET,
              description: 'Get all users',
              parameters: [
                {
                  name: 'page',
                  type: 'number',
                  required: false,
                },
              ],
              responses: {
                '200': { description: 'Success' },
              },
            },
            {
              path: '/users',
              method: HTTPMethod.POST,
              description: 'Create user',
            },
          ],
        };

        mockSchemaProviderInstance.getSchema.mockReturnValue(mockSchema);

        const result = await handler({
          params: {
            name: 'getEndpoint',
            arguments: {
              apiId: 'test-api',
              path: '/users',
              method: 'GET',
            },
          },
        });

        const endpoint = JSON.parse(result.content[0].text);
        expect(endpoint.path).toBe('/users');
        expect(endpoint.method).toBe(HTTPMethod.GET);
        expect(endpoint.description).toBe('Get all users');
        expect(endpoint.parameters).toHaveLength(1);
      });

      it('should return error for non-existent API', async () => {
        mockSchemaProviderInstance.getSchema.mockReturnValue(null);

        const result = await handler({
          params: {
            name: 'getEndpoint',
            arguments: {
              apiId: 'non-existent',
              path: '/users',
              method: 'GET',
            },
          },
        });

        expect(result.content[0].text).toContain("API schema with ID 'non-existent' not found");
      });

      it('should return error for non-existent endpoint', async () => {
        const mockSchema: APISchema = {
          id: 'test-api',
          name: 'Test API',
          version: '1.0.0',
          baseURL: 'https://api.test.com',
          endpoints: [],
        };

        mockSchemaProviderInstance.getSchema.mockReturnValue(mockSchema);

        const result = await handler({
          params: {
            name: 'getEndpoint',
            arguments: {
              apiId: 'test-api',
              path: '/missing',
              method: 'GET',
            },
          },
        });

        expect(result.content[0].text).toContain("Endpoint GET /missing not found in API 'test-api'");
      });
    });

    it('should throw error for unknown tool', async () => {
      await expect(
        handler({
          params: {
            name: 'unknownTool',
            arguments: {},
          },
        })
      ).rejects.toThrow('Unknown tool: unknownTool');
    });
  });

  describe('start', () => {
    it('should load schemas and connect to transport', async () => {
      mockSchemaProviderInstance.loadSchemas.mockResolvedValue(undefined);
      mockServerInstance.connect.mockResolvedValue(undefined);

      await mcpServer.start();

      expect(mockSchemaProviderInstance.loadSchemas).toHaveBeenCalled();
      expect(mockServerInstance.connect).toHaveBeenCalledWith(mockTransportInstance);
    });

    it('should handle startup errors', async () => {
      const error = new Error('Failed to load schemas');
      mockSchemaProviderInstance.loadSchemas.mockRejectedValue(error);

      await expect(mcpServer.start()).rejects.toThrow('Failed to load schemas');
    });
  });

  describe('stop', () => {
    it('should close the server', async () => {
      mockServerInstance.close.mockResolvedValue(undefined);

      await mcpServer.stop();

      expect(mockServerInstance.close).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should setup error handler', () => {
      expect(mockServerInstance.onerror).toBeDefined();
      
      // Test error handler
      const mockError = new Error('Test error');
      mockServerInstance.onerror(mockError);
      
      // Error handler should be called (mocked console.error)
    });

    it('should handle unhandled rejections', () => {
      // Process listeners should be set up
      const listeners = process.listeners('unhandledRejection');
      expect(listeners.length).toBeGreaterThan(0);
    });
  });
});