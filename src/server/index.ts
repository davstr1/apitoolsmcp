import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SchemaProvider } from './schema-provider';
import { Config } from '../types/config';
import { createTools } from './tools';

export class MCPServer {
  private server: Server;
  private schemaProvider: SchemaProvider;
  private transport: StdioServerTransport;

  constructor(config: Config) {
    this.server = new Server(
      {
        name: 'api-tools-mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.schemaProvider = new SchemaProvider(config);
    this.transport = new StdioServerTransport();
    
    this.setupTools();
    this.setupErrorHandlers();
  }

  private setupTools(): void {
    const tools = createTools(this.schemaProvider);
    
    for (const tool of tools) {
      this.server.setRequestHandler(tool.handler, tool.handler);
    }
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