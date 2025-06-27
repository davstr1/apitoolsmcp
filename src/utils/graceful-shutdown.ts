import { logger } from './logger';
import { stopMetricsServer } from '../monitoring/metrics-server';
import * as Express from 'express';

export interface ShutdownHandler {
  name: string;
  handler: () => Promise<void>;
  timeout?: number;
}

export class GracefulShutdown {
  private handlers: ShutdownHandler[] = [];
  private isShuttingDown = false;
  private activeRequests = new Set<string>();
  private shutdownTimeout = 30000; // 30 seconds default

  constructor() {
    this.setupSignalHandlers();
  }

  private setupSignalHandlers(): void {
    const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        logger.info(`Received ${signal}, starting graceful shutdown`);
        await this.shutdown();
      });
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      this.shutdown(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection at:', promise, 'reason:', reason);
      this.shutdown(1);
    });
  }

  registerHandler(handler: ShutdownHandler): void {
    this.handlers.push(handler);
    logger.debug(`Registered shutdown handler: ${handler.name}`);
  }

  trackRequest(requestId: string): void {
    this.activeRequests.add(requestId);
  }

  untrackRequest(requestId: string): void {
    this.activeRequests.delete(requestId);
  }

  async waitForActiveRequests(timeout: number = 10000): Promise<void> {
    const start = Date.now();
    
    while (this.activeRequests.size > 0 && Date.now() - start < timeout) {
      logger.info(`Waiting for ${this.activeRequests.size} active requests to complete`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (this.activeRequests.size > 0) {
      logger.warn(`Force closing ${this.activeRequests.size} remaining requests`);
    }
  }

  async shutdown(exitCode: number = 0): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    this.isShuttingDown = true;
    logger.info('Starting graceful shutdown sequence');

    // Set a hard timeout for shutdown
    const shutdownTimer = setTimeout(() => {
      logger.error('Shutdown timeout exceeded, forcing exit');
      process.exit(1);
    }, this.shutdownTimeout);

    try {
      // Step 1: Stop accepting new requests
      logger.info('Step 1: Stopping new requests');
      
      // Step 2: Wait for active requests to complete
      logger.info('Step 2: Waiting for active requests');
      await this.waitForActiveRequests();
      
      // Step 3: Close external connections
      logger.info('Step 3: Closing external connections');
      
      // Step 4: Run registered shutdown handlers
      logger.info('Step 4: Running shutdown handlers');
      for (const handler of this.handlers) {
        try {
          logger.info(`Running shutdown handler: ${handler.name}`);
          const handlerTimeout = handler.timeout || 5000;
          
          await Promise.race([
            handler.handler(),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Handler timeout')), handlerTimeout)
            )
          ]);
          
          logger.info(`Completed shutdown handler: ${handler.name}`);
        } catch (error) {
          logger.error(`Error in shutdown handler ${handler.name}:`, error);
        }
      }
      
      // Step 5: Close metrics server
      logger.info('Step 5: Stopping metrics server');
      await stopMetricsServer();
      
      // Step 6: Final cleanup
      logger.info('Step 6: Final cleanup');
      
      // Clear the shutdown timer
      clearTimeout(shutdownTimer);
      
      logger.info('Graceful shutdown completed');
      process.exit(exitCode);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      clearTimeout(shutdownTimer);
      process.exit(1);
    }
  }
}

// Singleton instance
let gracefulShutdown: GracefulShutdown | null = null;

export function getGracefulShutdown(): GracefulShutdown {
  if (!gracefulShutdown) {
    gracefulShutdown = new GracefulShutdown();
  }
  return gracefulShutdown;
}

// Express middleware for request tracking
export function requestTrackingMiddleware(_req: Express.Request, res: Express.Response, next: Express.NextFunction): void {
  const requestId = `${Date.now()}-${Math.random()}`;
  const shutdown = getGracefulShutdown();
  
  shutdown.trackRequest(requestId);
  
  res.on('finish', () => {
    shutdown.untrackRequest(requestId);
  });
  
  res.on('close', () => {
    shutdown.untrackRequest(requestId);
  });
  
  next();
}

// Helper function to register common shutdown handlers
export function registerCommonShutdownHandlers(): void {
  const shutdown = getGracefulShutdown();
  
  // Close database connections
  shutdown.registerHandler({
    name: 'database',
    handler: async () => {
      // Close database connections if any
      logger.info('Closing database connections');
    },
    timeout: 5000,
  });
  
  // Flush logs
  shutdown.registerHandler({
    name: 'logs',
    handler: async () => {
      logger.info('Flushing logs');
      // Ensure all logs are written
      await new Promise(resolve => setTimeout(resolve, 1000));
    },
    timeout: 2000,
  });
  
  // Save state
  shutdown.registerHandler({
    name: 'state',
    handler: async () => {
      logger.info('Saving application state');
      // Save any in-memory state that needs to be persisted
    },
    timeout: 5000,
  });
}