import * as fs from 'fs/promises';
import { logger } from '../utils/logger';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      message?: string;
      duration?: number;
    };
  };
}

export class HealthChecker {
  private startTime: number;
  private checks: Map<string, () => Promise<{ status: 'pass' | 'fail' | 'warn'; message?: string }>>;

  constructor() {
    this.startTime = Date.now();
    this.checks = new Map();
    this.registerDefaultChecks();
  }

  private registerDefaultChecks(): void {
    // File system check
    this.registerCheck('filesystem', async () => {
      try {
        const testFile = '.health-check-test';
        await fs.writeFile(testFile, 'test');
        await fs.unlink(testFile);
        return { status: 'pass' };
      } catch (error) {
        return { 
          status: 'fail', 
          message: `Filesystem write failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        };
      }
    });

    // Memory check
    this.registerCheck('memory', async () => {
      const usage = process.memoryUsage();
      const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;
      
      if (heapUsedPercent > 90) {
        return { 
          status: 'fail', 
          message: `High memory usage: ${heapUsedPercent.toFixed(1)}%` 
        };
      } else if (heapUsedPercent > 80) {
        return { 
          status: 'warn', 
          message: `Elevated memory usage: ${heapUsedPercent.toFixed(1)}%` 
        };
      }
      
      return { status: 'pass' };
    });

    // Schema directory check
    this.registerCheck('schema_directory', async () => {
      try {
        const config = require('../config/loader').getConfig();
        await fs.access(config.schemaDirectory);
        return { status: 'pass' };
      } catch (error) {
        return { 
          status: 'fail', 
          message: 'Schema directory not accessible' 
        };
      }
    });

    // Event loop lag check
    this.registerCheck('event_loop', async () => {
      const start = Date.now();
      await new Promise(resolve => setImmediate(resolve));
      const lag = Date.now() - start;
      
      if (lag > 100) {
        return { 
          status: 'fail', 
          message: `High event loop lag: ${lag}ms` 
        };
      } else if (lag > 50) {
        return { 
          status: 'warn', 
          message: `Moderate event loop lag: ${lag}ms` 
        };
      }
      
      return { status: 'pass' };
    });
  }

  registerCheck(
    name: string, 
    check: () => Promise<{ status: 'pass' | 'fail' | 'warn'; message?: string }>
  ): void {
    this.checks.set(name, check);
  }

  async performHealthCheck(): Promise<HealthStatus> {
    const checks: HealthStatus['checks'] = {};
    let overallStatus: HealthStatus['status'] = 'healthy';

    for (const [name, check] of this.checks) {
      const start = Date.now();
      try {
        const result = await check();
        checks[name] = {
          ...result,
          duration: Date.now() - start,
        };

        if (result.status === 'fail') {
          overallStatus = 'unhealthy';
        } else if (result.status === 'warn' && overallStatus === 'healthy') {
          overallStatus = 'degraded';
        }
      } catch (error) {
        checks[name] = {
          status: 'fail',
          message: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          duration: Date.now() - start,
        };
        overallStatus = 'unhealthy';
      }
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks,
    };
  }

  async performLivenessCheck(): Promise<{ alive: boolean; message?: string }> {
    // Simple liveness check - if the process can respond, it's alive
    try {
      // Check if we can allocate a small amount of memory
      const test = Buffer.alloc(1024);
      
      // Check if we can perform basic arithmetic
      const result = 1 + 1;
      if (result !== 2) {
        throw new Error('Basic arithmetic failed');
      }
      
      return { alive: true };
    } catch (error) {
      return { 
        alive: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async performReadinessCheck(): Promise<{ ready: boolean; message?: string }> {
    // Check if the service is ready to accept traffic
    const health = await this.performHealthCheck();
    
    if (health.status === 'unhealthy') {
      return { 
        ready: false, 
        message: 'Service is unhealthy' 
      };
    }
    
    // Additional readiness checks
    try {
      // Check if critical dependencies are available
      const config = require('../config/loader').getConfig();
      if (!config.schemaDirectory) {
        throw new Error('Schema directory not configured');
      }
      
      return { ready: true };
    } catch (error) {
      return { 
        ready: false, 
        message: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
}

// Singleton instance
let healthChecker: HealthChecker | null = null;

export function getHealthChecker(): HealthChecker {
  if (!healthChecker) {
    healthChecker = new HealthChecker();
  }
  return healthChecker;
}

// Express middleware for health endpoints
export function healthCheckMiddleware(app: any): void {
  const checker = getHealthChecker();

  app.get('/health', async (req: any, res: any) => {
    const health = await checker.performHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 200 : 503;
    res.status(statusCode).json(health);
  });

  app.get('/health/live', async (req: any, res: any) => {
    const liveness = await checker.performLivenessCheck();
    res.status(liveness.alive ? 200 : 503).json(liveness);
  });

  app.get('/health/ready', async (req: any, res: any) => {
    const readiness = await checker.performReadinessCheck();
    res.status(readiness.ready ? 200 : 503).json(readiness);
  });
}