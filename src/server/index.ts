import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema,
  Tool
} from '@modelcontextprotocol/sdk/types.js';
import { SchemaProvider } from './schema-provider';
import { Config } from '../types/config';

export class MCPServer {
  private server: Server;
  private schemaProvider: SchemaProvider;
  private transport: StdioServerTransport;

  constructor(config: Config) {
    this.server = new Server(
      {
        name: 'api-tools-mcp',
        version: '0.2.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.schemaProvider = new SchemaProvider(config);
    this.transport = new StdioServerTransport();
    
    this.setupHandlers();
    this.setupErrorHandlers();
  }

  private setupHandlers(): void {
    // Handle list tools request
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools: Tool[] = [
        {
          name: 'listAPIs',
          description: 'List all available API schemas',
          inputSchema: {
            type: 'object',
            properties: {
              search: {
                type: 'string',
                description: 'Optional search query to filter APIs',
              },
            },
          },
        },
        {
          name: 'getAPISchema',
          description: 'Get detailed information about a specific API schema',
          inputSchema: {
            type: 'object',
            properties: {
              apiId: {
                type: 'string',
                description: 'The ID of the API schema to retrieve',
              },
            },
            required: ['apiId'],
          },
        },
        {
          name: 'getEndpoint',
          description: 'Get details about a specific endpoint from an API schema',
          inputSchema: {
            type: 'object',
            properties: {
              apiId: {
                type: 'string',
                description: 'The ID of the API schema',
              },
              path: {
                type: 'string',
                description: 'The path of the endpoint',
              },
              method: {
                type: 'string',
                description: 'The HTTP method of the endpoint',
                enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
              },
            },
            required: ['apiId', 'path', 'method'],
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'listAPIs': {
          const schemas = args?.search 
            ? this.schemaProvider.searchSchemas(args.search as string)
            : this.schemaProvider.listSchemas();

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(
                schemas.map(s => ({
                  id: s.id,
                  name: s.name,
                  version: s.version,
                  description: s.description,
                  baseURL: s.baseURL,
                  endpointCount: s.endpoints.length,
                })),
                null,
                2
              ),
            }],
          };
        }

        case 'getAPISchema': {
          const apiId = args?.apiId as string;
          const schema = this.schemaProvider.getSchema(apiId);

          if (!schema) {
            return {
              content: [{
                type: 'text',
                text: `API schema with ID '${apiId}' not found`,
              }],
            };
          }

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(schema, null, 2),
            }],
          };
        }

        case 'getEndpoint': {
          const { apiId, path, method } = args as any;
          const schema = this.schemaProvider.getSchema(apiId);

          if (!schema) {
            return {
              content: [{
                type: 'text',
                text: `API schema with ID '${apiId}' not found`,
              }],
            };
          }

          const endpoint = schema.endpoints.find(
            e => e.path === path && e.method === method
          );

          if (!endpoint) {
            return {
              content: [{
                type: 'text',
                text: `Endpoint ${method} ${path} not found in API '${apiId}'`,
              }],
            };
          }

          return {
            content: [{
              type: 'text',
              text: JSON.stringify(endpoint, null, 2),
            }],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private setupErrorHandlers(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
    };

    process.on('unhandledRejection', (error) => {
      console.error('[Unhandled Rejection]', error);
    });
  }

  async start(): Promise<void> {
    console.error('[MCP Server] Starting...');
    
    try {
      await this.schemaProvider.loadSchemas();
      console.error(`[MCP Server] Loaded ${this.schemaProvider.getSchemaCount()} schemas`);
      
      await this.server.connect(this.transport);
      console.error('[MCP Server] Connected and ready');
    } catch (error) {
      console.error('[MCP Server] Failed to start:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.error('[MCP Server] Stopping...');
    await this.server.close();
  }
}