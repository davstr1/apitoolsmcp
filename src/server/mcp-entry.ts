#!/usr/bin/env node

import { MCPServer } from './index';
import { getConfig } from '../config/loader';

async function main() {
  try {
    const config = await getConfig();
    const server = new MCPServer(config);
    
    await server.start();
    
    process.on('SIGINT', async () => {
      await server.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      await server.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

main();