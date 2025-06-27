import { SchemaProvider } from '../../src/server/schema-provider';
import { YAMLScanner } from '../../src/schemas/yaml-scanner';
import { Config } from '../../src/types/config';
import { APISchema, HTTPMethod } from '../../src/types/api-schema';

jest.mock('../../src/schemas/yaml-scanner');

describe('SchemaProvider', () => {
  const mockYAMLScanner = YAMLScanner as jest.MockedClass<typeof YAMLScanner>;
  
  let provider: SchemaProvider;
  let config: Config;
  let mockScanDirectory: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    config = {
      schemaDirectory: '/test/schemas',
      remoteImports: { enabled: true, cacheDuration: 3600000 },
      validation: { strict: true },
    };

    mockScanDirectory = jest.fn();
    mockYAMLScanner.mockImplementation(() => ({
      scanDirectory: mockScanDirectory,
    } as any));

    provider = new SchemaProvider(config);
  });

  describe('loadSchemas', () => {
    it('should load schemas from directory', async () => {
      const mockSchemas: APISchema[] = [
        {
          id: 'api1',
          name: 'API 1',
          version: '1.0.0',
          baseURL: 'https://api1.test.com',
          endpoints: [],
        },
        {
          id: 'api2',
          name: 'API 2',
          version: '1.0.0',
          baseURL: 'https://api2.test.com',
          endpoints: [],
        },
      ];

      mockScanDirectory.mockResolvedValue(mockSchemas);

      await provider.loadSchemas();

      expect(mockScanDirectory).toHaveBeenCalled();
      expect(provider.getSchemaCount()).toBe(2);
    });

    it('should handle empty directory', async () => {
      mockScanDirectory.mockResolvedValue([]);

      await provider.loadSchemas();

      expect(provider.getSchemaCount()).toBe(0);
    });

    it('should handle scan errors', async () => {
      mockScanDirectory.mockRejectedValue(new Error('Scan failed'));

      await expect(provider.loadSchemas()).rejects.toThrow('Scan failed');
    });

    it('should cache schemas after loading', async () => {
      const mockSchemas: APISchema[] = [
        {
          id: 'cached-api',
          name: 'Cached API',
          version: '1.0.0',
          baseURL: 'https://cached.test.com',
          endpoints: [],
        },
      ];

      mockScanDirectory.mockResolvedValue(mockSchemas);

      await provider.loadSchemas();
      
      // Second call should use cached data
      const schema = provider.getSchema('cached-api');
      expect(schema).toBeDefined();
      expect(schema!.name).toBe('Cached API');
    });
  });

  describe('listSchemas', () => {
    beforeEach(async () => {
      const mockSchemas: APISchema[] = [
        {
          id: 'api1',
          name: 'First API',
          version: '1.0.0',
          baseURL: 'https://first.test.com',
          endpoints: [],
        },
        {
          id: 'api2',
          name: 'Second API',
          version: '2.0.0',
          baseURL: 'https://second.test.com',
          endpoints: [
            { path: '/users', method: HTTPMethod.GET },
          ],
        },
        {
          id: 'api3',
          name: 'Third API',
          version: '3.0.0',
          description: 'Third API description',
          baseURL: 'https://third.test.com',
          endpoints: [],
        },
      ];

      mockScanDirectory.mockResolvedValue(mockSchemas);
      await provider.loadSchemas();
    });

    it('should return all loaded schemas', () => {
      const schemas = provider.listSchemas();
      
      expect(schemas).toHaveLength(3);
      expect(schemas.map(s => s.id)).toEqual(['api1', 'api2', 'api3']);
    });

    it('should return empty array before loading', () => {
      const newProvider = new SchemaProvider(config);
      const schemas = newProvider.listSchemas();
      
      expect(schemas).toHaveLength(0);
    });
  });

  describe('searchSchemas', () => {
    beforeEach(async () => {
      const mockSchemas: APISchema[] = [
        {
          id: 'user-api',
          name: 'User Management API',
          version: '1.0.0',
          description: 'API for managing users',
          baseURL: 'https://users.test.com',
          endpoints: [],
        },
        {
          id: 'product-api',
          name: 'Product Catalog API',
          version: '1.0.0',
          description: 'API for product management',
          baseURL: 'https://products.test.com',
          endpoints: [],
        },
        {
          id: 'order-api',
          name: 'Order Service',
          version: '1.0.0',
          description: 'Handles user orders',
          baseURL: 'https://orders.test.com',
          endpoints: [],
        },
      ];

      mockScanDirectory.mockResolvedValue(mockSchemas);
      await provider.loadSchemas();
    });

    it('should search by name', () => {
      const results = provider.searchSchemas('user');
      
      expect(results).toHaveLength(2);
      expect(results.map(s => s.id).sort()).toEqual(['order-api', 'user-api']);
    });

    it('should search by description', () => {
      const results = provider.searchSchemas('product');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('product-api');
    });

    it('should search by baseURL', () => {
      const results = provider.searchSchemas('orders.test.com');
      
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('order-api');
    });

    it('should be case insensitive', () => {
      const results = provider.searchSchemas('USER');
      
      expect(results).toHaveLength(2);
    });

    it('should return empty array for no matches', () => {
      const results = provider.searchSchemas('nonexistent');
      
      expect(results).toHaveLength(0);
    });

    it('should return all schemas for empty search', () => {
      const results = provider.searchSchemas('');
      
      expect(results).toHaveLength(3);
    });
  });

  describe('getSchema', () => {
    beforeEach(async () => {
      const mockSchemas: APISchema[] = [
        {
          id: 'test-api',
          name: 'Test API',
          version: '1.0.0',
          baseURL: 'https://test.com',
          endpoints: [
            {
              path: '/users',
              method: HTTPMethod.GET,
              description: 'Get users',
            },
          ],
        },
      ];

      mockScanDirectory.mockResolvedValue(mockSchemas);
      await provider.loadSchemas();
    });

    it('should return schema by ID', () => {
      const schema = provider.getSchema('test-api');
      
      expect(schema).toBeDefined();
      expect(schema!.name).toBe('Test API');
      expect(schema!.endpoints).toHaveLength(1);
    });

    it('should return undefined for non-existent ID', () => {
      const schema = provider.getSchema('non-existent');
      
      expect(schema).toBeUndefined();
    });

    it('should return undefined before schemas are loaded', () => {
      const newProvider = new SchemaProvider(config);
      const schema = newProvider.getSchema('test-api');
      
      expect(schema).toBeUndefined();
    });
  });

  describe('getSchemaCount', () => {
    it('should return 0 initially', () => {
      expect(provider.getSchemaCount()).toBe(0);
    });

    it('should return correct count after loading', async () => {
      const mockSchemas: APISchema[] = [
        {
          id: 'api1',
          name: 'API 1',
          version: '1.0.0',
          baseURL: 'https://api1.com',
          endpoints: [],
        },
        {
          id: 'api2',
          name: 'API 2',
          version: '1.0.0',
          baseURL: 'https://api2.com',
          endpoints: [],
        },
        {
          id: 'api3',
          name: 'API 3',
          version: '1.0.0',
          baseURL: 'https://api3.com',
          endpoints: [],
        },
      ];

      mockScanDirectory.mockResolvedValue(mockSchemas);
      await provider.loadSchemas();

      expect(provider.getSchemaCount()).toBe(3);
    });
  });

  describe('reload functionality', () => {
    it('should reload schemas when called multiple times', async () => {
      const firstLoad: APISchema[] = [
        {
          id: 'api1',
          name: 'API 1',
          version: '1.0.0',
          baseURL: 'https://api1.com',
          endpoints: [],
        },
      ];

      const secondLoad: APISchema[] = [
        {
          id: 'api1',
          name: 'API 1 Updated',
          version: '2.0.0',
          baseURL: 'https://api1.com',
          endpoints: [],
        },
        {
          id: 'api2',
          name: 'API 2',
          version: '1.0.0',
          baseURL: 'https://api2.com',
          endpoints: [],
        },
      ];

      mockScanDirectory.mockResolvedValueOnce(firstLoad);
      await provider.loadSchemas();
      expect(provider.getSchemaCount()).toBe(1);
      expect(provider.getSchema('api1')!.version).toBe('1.0.0');

      mockScanDirectory.mockResolvedValueOnce(secondLoad);
      await provider.loadSchemas();
      expect(provider.getSchemaCount()).toBe(2);
      expect(provider.getSchema('api1')!.version).toBe('2.0.0');
      expect(provider.getSchema('api2')).toBeDefined();
    });
  });
});