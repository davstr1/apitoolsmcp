import * as http from 'http';
import * as express from 'express';

export interface MockServer {
  port: number;
  close: () => Promise<void>;
  setRoute: (path: string, handler: express.RequestHandler) => void;
}

export async function createMockServer(): Promise<MockServer> {
  const app = express();
  app.use(express.json());
  
  // Default routes
  app.get('/users', (req, res) => {
    res.json({
      users: [
        { id: 1, name: 'User 1' },
        { id: 2, name: 'User 2' },
      ],
      page: req.query.page || 1,
      limit: req.query.limit || 10,
    });
  });
  
  app.post('/users', (req, res) => {
    res.status(201).json({
      id: 3,
      ...req.body,
    });
  });
  
  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  
  const server = http.createServer(app);
  
  return new Promise((resolve) => {
    server.listen(0, () => {
      const address = server.address();
      const port = typeof address === 'object' ? address?.port : 0;
      
      resolve({
        port: port || 0,
        close: () => new Promise((resolve) => {
          server.close(() => resolve());
        }),
        setRoute: (path: string, handler: express.RequestHandler) => {
          // Remove existing route and add new one
          const routes = app._router.stack;
          routes.forEach((route: any, i: number) => {
            if (route.route && route.route.path === path) {
              routes.splice(i, 1);
            }
          });
          app.all(path, handler);
        },
      });
    });
  });
}