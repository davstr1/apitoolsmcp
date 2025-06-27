import * as http from 'http';
import { getMetrics } from './metrics';
import { logger } from '../utils/logger';

export class MetricsServer {
  private server?: http.Server;
  private port: number;

  constructor(port: number = 9090) {
    this.port = port;
  }

  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        if (req.url === '/metrics' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' });
          res.end(getMetrics());
        } else if (req.url === '/health' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'healthy' }));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      });

      this.server.listen(this.port, () => {
        logger.info(`Metrics server listening on port ${this.port}`);
        resolve();
      });

      this.server.on('error', (error) => {
        logger.error('Metrics server error', error);
        reject(error);
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('Metrics server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Singleton instance
let metricsServer: MetricsServer | null = null;

export function startMetricsServer(port?: number): Promise<void> {
  if (!metricsServer) {
    metricsServer = new MetricsServer(port);
    return metricsServer.start();
  }
  return Promise.resolve();
}

export function stopMetricsServer(): Promise<void> {
  if (metricsServer) {
    const server = metricsServer;
    metricsServer = null;
    return server.stop();
  }
  return Promise.resolve();
}