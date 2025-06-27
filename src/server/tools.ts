import { 
  ListToolsRequestSchema, 
  CallToolRequestSchema,
  Tool,
  TextContent
} from '@modelcontextprotocol/sdk/types.js';
import { SchemaProvider } from './schema-provider';
import { APISchema } from '../types/api-schema';

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: any;
  handler: any;
}

export function createTools(schemaProvider: SchemaProvider): ToolDefinition[] {
  const tools: ToolDefinition[] = [];

  // List all available APIs
  tools.push({
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
    handler: ListToolsRequestSchema.parse(async (request: any) => {
      const schemas = request.params?.search 
        ? schemaProvider.searchSchemas(request.params.search)
        : schemaProvider.listSchemas();

      const content: TextContent = {
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
      };

      return { content: [content] };
    }),
  });

  // Get details of a specific API schema
  tools.push({
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
    handler: CallToolRequestSchema.parse(async (request: any) => {
      const { apiId } = request.params;
      const schema = schemaProvider.getSchema(apiId);

      if (!schema) {
        return {
          content: [{
            type: 'text',
            text: `API schema with ID '${apiId}' not found`,
          }],
        };
      }

      const content: TextContent = {
        type: 'text',
        text: JSON.stringify(schema, null, 2),
      };

      return { content: [content] };
    }),
  });

  // Get a specific endpoint from an API
  tools.push({
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
    handler: CallToolRequestSchema.parse(async (request: any) => {
      const { apiId, path, method } = request.params;
      const schema = schemaProvider.getSchema(apiId);

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

      const content: TextContent = {
        type: 'text',
        text: JSON.stringify(endpoint, null, 2),
      };

      return { content: [content] };
    }),
  });

  return tools;
}