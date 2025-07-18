import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { SchemaProvider } from './schema-provider';
import { Config } from '../types/config';
import { mcpLogger } from '../utils/logger';

export class MCPServer {
  private server: Server;
  private schemaProvider: SchemaProvider;
  private transport: StdioServerTransport;

  constructor(config: Config) {
    this.server = new Server(
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
        {
          name: 'healthCheck',
          description: 'Check the health status of the API Tools MCP server',
          inputSchema: {
            type: 'object',
            properties: {
              verbose: {
                type: 'boolean',
                description: 'Return detailed health information',
                default: false,
              },
            },
          },
        },
      ];

      return { tools };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async request => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'listAPIs': {
          const schemas = args?.search
            ? this.schemaProvider.searchSchemas(args.search as string)
            : this.schemaProvider.listSchemas();

          return {
            content: [
              {
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
              },
            ],
          };
        }

        case 'getAPISchema': {
          const apiId = args?.apiId as string;
          const schema = this.schemaProvider.getSchema(apiId);

          if (!schema) {
            return {
              content: [
                {
                  type: 'text',
                  text: `API schema with ID '${apiId}' not found`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(schema, null, 2),
              },
            ],
          };
        }

        case 'getEndpoint': {
          const { apiId, path, method } = args as any;
          const schema = this.schemaProvider.getSchema(apiId);

          if (!schema) {
            return {
              content: [
                {
                  type: 'text',
                  text: `API schema with ID '${apiId}' not found`,
                },
              ],
            };
          }

          const endpoint = schema.endpoints.find(e => e.path === path && e.method === method);

          if (!endpoint) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Endpoint ${method} ${path} not found in API '${apiId}'`,
                },
              ],
            };
          }

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(endpoint, null, 2),
              },
            ],
          };
        }

        case 'healthCheck': {
          const verbose = args?.verbose || false;

          const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '0.3.0',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            schemas: {
              loaded: this.schemaProvider.listSchemas().length,
              directory: this.schemaProvider.getSchemaDirectory(),
            },
          };

          if (!verbose) {
            // Return simple health status
            return {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      status: health.status,
                      timestamp: health.timestamp,
                      version: health.version,
                      schemas_loaded: health.schemas.loaded,
                    },
                    null,
                    2
                  ),
                },
              ],
            };
          }

          // Return detailed health information
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(health, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  private setupErrorHandlers(): void {
    this.server.onerror = error => {
      mcpLogger.error('MCP Server Error', {
        error: error instanceof Error ? error.message : error,
      });
    };

    process.on('unhandledRejection', error => {
      mcpLogger.error('Unhandled Rejection', {
        error: error instanceof Error ? error.message : error,
      });
    });
  }

  async start(): Promise<void> {
    mcpLogger.info('Starting MCP Server...');

    try {
      await this.schemaProvider.loadSchemas();
      mcpLogger.info('Loaded schemas', { count: this.schemaProvider.getSchemaCount() });

      await this.server.connect(this.transport);
      mcpLogger.info('MCP Server connected and ready');
    } catch (error) {
      mcpLogger.error('Failed to start MCP Server', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    mcpLogger.info('Stopping MCP Server...');
    await this.server.close();
  }
}
