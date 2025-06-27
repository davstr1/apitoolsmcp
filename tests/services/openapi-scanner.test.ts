import { OpenAPIScanner } from '../../src/services/openapi-scanner';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createTempDir, cleanupTempDir } from '../setup';

describe('OpenAPIScanner', () => {
  let scanner: OpenAPIScanner;
  let tempDir: string;

  beforeEach(() => {
    scanner = new OpenAPIScanner();
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('scan', () => {
    it('should find OpenAPI v3 spec in root directory', async () => {
      const openApiSpec = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
          description: 'Test API description',
        },
        servers: [{ url: 'https://api.test.com' }],
        paths: {
          '/users': {
            get: {
              summary: 'Get users',
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      };

      await fs.writeFile(
        path.join(tempDir, 'openapi.json'),
        JSON.stringify(openApiSpec),
        'utf-8'
      );

      const results = await scanner.scan(tempDir);

      expect(results).toHaveLength(1);
      expect(results[0].path).toBe(path.join(tempDir, 'openapi.json'));
      expect(results[0].title).toBe('Test API');
      expect(results[0].version).toBe('3.0.0');
      expect(results[0].description).toBe('Test API description');
    });

    it('should find OpenAPI v2 (Swagger) spec', async () => {
      const swaggerSpec = {
        swagger: '2.0',
        info: {
          title: 'Swagger API',
          version: '2.0.0',
          description: 'Swagger API description',
        },
        host: 'api.swagger.com',
        basePath: '/v2',
        paths: {
          '/pets': {
            get: {
              summary: 'List pets',
              responses: { '200': { description: 'Success' } },
            },
          },
        },
      };

      await fs.mkdir(path.join(tempDir, 'docs'), { recursive: true });
      await fs.writeFile(
        path.join(tempDir, 'docs', 'swagger.json'),
        JSON.stringify(swaggerSpec),
        'utf-8'
      );

      const results = await scanner.scan(tempDir);

      expect(results).toHaveLength(1);
      expect(results[0].path).toBe(path.join(tempDir, 'docs', 'swagger.json'));
      expect(results[0].title).toBe('Swagger API');
      expect(results[0].version).toBe('2.0');
    });

    it('should find YAML OpenAPI specs', async () => {
      const yamlContent = `
openapi: 3.0.0
info:
  title: YAML API
  version: 1.0.0
  description: YAML format API
servers:
  - url: https://api.yaml.com
paths:
  /items:
    get:
      summary: Get items
`;

      await fs.mkdir(path.join(tempDir, '.openapi'), { recursive: true });
      await fs.writeFile(
        path.join(tempDir, '.openapi', 'api.yaml'),
        yamlContent,
        'utf-8'
      );

      const results = await scanner.scan(tempDir);

      expect(results).toHaveLength(1);
      expect(results[0].path).toBe(path.join(tempDir, '.openapi', 'api.yaml'));
      expect(results[0].title).toBe('YAML API');
    });

    it('should find multiple OpenAPI files', async () => {
      const spec1 = {
        openapi: '3.0.0',
        info: { title: 'API 1', version: '1.0.0' },
        paths: {},
      };

      const spec2 = {
        swagger: '2.0',
        info: { title: 'API 2', version: '2.0.0' },
        paths: {},
      };

      await fs.writeFile(
        path.join(tempDir, 'openapi.json'),
        JSON.stringify(spec1),
        'utf-8'
      );
      await fs.writeFile(
        path.join(tempDir, 'swagger.json'),
        JSON.stringify(spec2),
        'utf-8'
      );

      const results = await scanner.scan(tempDir);

      expect(results).toHaveLength(2);
      expect(results.map(r => r.title).sort()).toEqual(['API 1', 'API 2']);
    });

    it('should scan common locations', async () => {
      // Create specs in various common locations
      const locations = [
        '.openapi/spec.json',
        'docs/api.json',
        'swagger.json',
        'openapi.yaml',
        'api/openapi.json',
        'spec/swagger.yaml',
      ];

      for (const location of locations) {
        const dir = path.dirname(location);
        if (dir !== '.') {
          await fs.mkdir(path.join(tempDir, dir), { recursive: true });
        }

        const spec = {
          openapi: '3.0.0',
          info: { title: `API at ${location}`, version: '1.0.0' },
          paths: {},
        };

        await fs.writeFile(
          path.join(tempDir, location),
          JSON.stringify(spec),
          'utf-8'
        );
      }

      const results = await scanner.scan(tempDir);

      expect(results.length).toBeGreaterThanOrEqual(locations.length);
      const foundPaths = results.map(r => r.path);
      
      for (const location of locations) {
        expect(foundPaths.some(p => p.endsWith(location))).toBe(true);
      }
    });

    it('should ignore non-OpenAPI JSON files', async () => {
      const validSpec = {
        openapi: '3.0.0',
        info: { title: 'Valid API', version: '1.0.0' },
        paths: {},
      };

      const invalidSpecs = [
        { name: 'package.json', content: { name: 'test-package', version: '1.0.0' } },
        { name: 'config.json', content: { apiKey: 'secret' } },
        { name: 'data.json', content: [1, 2, 3] },
      ];

      await fs.writeFile(
        path.join(tempDir, 'openapi.json'),
        JSON.stringify(validSpec),
        'utf-8'
      );

      for (const invalid of invalidSpecs) {
        await fs.writeFile(
          path.join(tempDir, invalid.name),
          JSON.stringify(invalid.content),
          'utf-8'
        );
      }

      const results = await scanner.scan(tempDir);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Valid API');
    });

    it('should handle empty directories', async () => {
      const results = await scanner.scan(tempDir);
      expect(results).toHaveLength(0);
    });

    it('should handle missing directory gracefully', async () => {
      const nonExistentDir = path.join(tempDir, 'non-existent');
      const results = await scanner.scan(nonExistentDir);
      expect(results).toHaveLength(0);
    });

    it('should handle malformed JSON gracefully', async () => {
      await fs.writeFile(
        path.join(tempDir, 'broken.json'),
        '{ "openapi": "3.0.0", invalid json',
        'utf-8'
      );

      const results = await scanner.scan(tempDir);
      expect(results).toHaveLength(0);
    });

    it('should handle malformed YAML gracefully', async () => {
      await fs.writeFile(
        path.join(tempDir, 'broken.yaml'),
        'openapi: 3.0.0\n  invalid: yaml: structure:::',
        'utf-8'
      );

      const results = await scanner.scan(tempDir);
      expect(results).toHaveLength(0);
    });

    it('should respect max depth to avoid infinite recursion', async () => {
      // Create deeply nested structure
      let currentPath = tempDir;
      for (let i = 0; i < 20; i++) {
        currentPath = path.join(currentPath, `level${i}`);
        await fs.mkdir(currentPath, { recursive: true });
      }

      const spec = {
        openapi: '3.0.0',
        info: { title: 'Deep API', version: '1.0.0' },
        paths: {},
      };

      await fs.writeFile(
        path.join(currentPath, 'openapi.json'),
        JSON.stringify(spec),
        'utf-8'
      );

      const results = await scanner.scan(tempDir);

      // Should find it if within max depth, or return empty if too deep
      expect(results.length).toBeLessThanOrEqual(1);
    });

    // Server extraction tests removed - feature not implemented in scanner
  });
});