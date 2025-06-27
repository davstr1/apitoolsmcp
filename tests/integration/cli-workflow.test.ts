import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { createTempDir, cleanupTempDir } from '../setup';
import { APISchema, HTTPMethod } from '../../src/types/api-schema';
import { getConfig } from '../../src/config/loader';
import { YAMLScanner } from '../../src/schemas/yaml-scanner';
import { Validator } from '../../src/schemas/validator';
import { Parser } from '../../src/schemas/parser';

// Mock modules to avoid actual HTTP requests and file operations
jest.mock('../../src/config/loader');
jest.mock('node-fetch');

describe('CLI Workflow Integration', () => {
  const mockGetConfig = getConfig as jest.MockedFunction<typeof getConfig>;
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeAll(() => {
    originalEnv = { ...process.env };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = createTempDir();
    
    // Set environment to use temp directory
    process.env.APITOOLSMCP_SCHEMA_DIR = tempDir;
    
    mockGetConfig.mockResolvedValue({
      schemaDirectory: tempDir,
      remoteImports: { enabled: true, cacheDuration: 3600000 },
      validation: { strict: true },
    });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
    process.env = originalEnv;
  });

  describe('Manual API Creation Workflow', () => {
    it('should create, list, and validate a manual API', async () => {
      // Step 1: Create a manual API schema
      const schema: APISchema = {
        id: 'test-workflow-api',
        name: 'Test Workflow API',
        version: '1.0.0',
        description: 'API created for workflow testing',
        baseURL: 'https://api.workflow.test',
        endpoints: [
          {
            path: '/users',
            method: HTTPMethod.GET,
            description: 'Get all users',
            parameters: [
              {
                name: 'page',
                type: 'number',
                required: false,
                description: 'Page number',
                default: 1,
              },
            ],
            responses: {
              '200': {
                description: 'Success',
                contentType: 'application/json',
                example: { users: [], total: 0 },
              },
            },
          },
          {
            path: '/users/{id}',
            method: HTTPMethod.GET,
            description: 'Get user by ID',
            parameters: [
              {
                name: 'id',
                type: 'string',
                required: true,
                description: 'User ID',
              },
            ],
          },
        ],
        metadata: {
          source: 'manual',
          createdAt: new Date().toISOString(),
        },
      };

      const schemaPath = path.join(tempDir, 'test-workflow-api.yaml');
      await fs.writeFile(schemaPath, yaml.dump(schema), 'utf-8');

      // Step 2: List APIs
      const scanner = new YAMLScanner(tempDir);
      const schemas = await scanner.scanDirectory();
      
      expect(schemas).toHaveLength(1);
      expect(schemas[0].id).toBe('test-workflow-api');
      expect(schemas[0].endpoints).toHaveLength(2);

      // Step 3: Validate the schema
      const validator = new Validator();
      const validationResult = validator.validate(schemas[0]);
      
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);

      // Step 4: Search for the API
      const searchResults = schemas.filter(s => 
        s.name.toLowerCase().includes('workflow') ||
        s.description?.toLowerCase().includes('workflow')
      );
      
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].id).toBe('test-workflow-api');
    });

    it('should handle API editing workflow', async () => {
      // Create initial schema
      const initialSchema: APISchema = {
        id: 'edit-test-api',
        name: 'Edit Test API',
        version: '1.0.0',
        baseURL: 'https://api.edit.test',
        endpoints: [],
      };

      const schemaPath = path.join(tempDir, 'edit-test-api.yaml');
      await fs.writeFile(schemaPath, yaml.dump(initialSchema), 'utf-8');

      // Edit the schema
      const updatedSchema: APISchema = {
        ...initialSchema,
        version: '2.0.0',
        description: 'Updated description',
        endpoints: [
          {
            path: '/items',
            method: HTTPMethod.GET,
            description: 'Get items',
          },
        ],
        metadata: {
          ...initialSchema.metadata,
          lastModified: new Date().toISOString(),
        },
      };

      await fs.writeFile(schemaPath, yaml.dump(updatedSchema), 'utf-8');

      // Verify changes
      const content = await fs.readFile(schemaPath, 'utf-8');
      const loaded = yaml.load(content) as APISchema;
      
      expect(loaded.version).toBe('2.0.0');
      expect(loaded.description).toBe('Updated description');
      expect(loaded.endpoints).toHaveLength(1);
    });
  });

  describe('URL-based API Testing Workflow', () => {
    it('should simulate URL-based API creation', async () => {
      // This would normally involve actual HTTP requests
      // For testing, we'll simulate the workflow steps
      
      // Step 1: Parse URL and extract parameters
      const testUrl = new URL('https://api.example.com/v1/products?category=electronics&limit=10');
      const queryParams = Object.fromEntries(testUrl.searchParams);
      
      expect(queryParams).toEqual({
        category: 'electronics',
        limit: '10',
      });

      // Step 2: Create schema from test results
      const generatedSchema: APISchema = {
        id: 'example-api',
        name: 'Example API',
        version: '1.0.0',
        baseURL: `${testUrl.protocol}//${testUrl.host}`,
        endpoints: [
          {
            path: testUrl.pathname,
            method: HTTPMethod.GET,
            parameters: [
              {
                name: 'category',
                type: 'string',
                required: false,
                example: 'electronics',
              },
              {
                name: 'limit',
                type: 'number',
                required: false,
                example: 10,
                default: 10,
              },
            ],
            responses: {
              '200': {
                description: 'Success',
                contentType: 'application/json',
                schema: {
                  type: 'object',
                  properties: {
                    products: { type: 'array' },
                    total: { type: 'number' },
                  },
                },
              },
            },
          },
        ],
        metadata: {
          source: 'tested',
          createdAt: new Date().toISOString(),
          lastTestedAt: new Date().toISOString(),
          testResults: [
            {
              timestamp: new Date().toISOString(),
              endpoint: testUrl.pathname,
              method: HTTPMethod.GET,
              statusCode: 200,
              responseTime: 150,
              success: true,
            },
          ],
        },
      };

      // Step 3: Save the generated schema
      const schemaPath = path.join(tempDir, 'example-api.yaml');
      await fs.writeFile(schemaPath, yaml.dump(generatedSchema), 'utf-8');

      // Step 4: Verify it can be loaded and validated
      const scanner = new YAMLScanner(tempDir);
      const schemas = await scanner.scanDirectory();
      
      expect(schemas).toHaveLength(1);
      expect(schemas[0].metadata?.source).toBe('tested');
      expect(schemas[0].metadata?.testResults).toHaveLength(1);
    });
  });

  describe('Import Workflow', () => {
    it('should import and validate OpenAPI spec', async () => {
      // Create a mock OpenAPI spec
      const openApiSpec = {
        openapi: '3.0.0',
        info: {
          title: 'Import Test API',
          version: '1.0.0',
          description: 'API for import testing',
        },
        servers: [{ url: 'https://api.import.test' }],
        paths: {
          '/resources': {
            get: {
              summary: 'List resources',
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'integer' },
                            name: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      const openApiPath = path.join(tempDir, 'import-test.json');
      await fs.writeFile(openApiPath, JSON.stringify(openApiSpec), 'utf-8');

      // Simulate import process
      const importedSchema: APISchema = {
        id: 'import-test-api',
        name: 'Import Test API',
        version: '1.0.0',
        description: 'API for import testing',
        baseURL: 'https://api.import.test',
        endpoints: [
          {
            path: '/resources',
            method: HTTPMethod.GET,
            description: 'List resources',
            responses: {
              '200': {
                description: 'Success',
                contentType: 'application/json',
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'integer' },
                      name: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
        ],
        metadata: {
          source: 'imported',
          sourceFile: openApiPath,
          importedAt: new Date().toISOString(),
        },
      };

      const schemaPath = path.join(tempDir, 'import-test-api.yaml');
      await fs.writeFile(schemaPath, yaml.dump(importedSchema), 'utf-8');

      // Validate imported schema
      const validator = new Validator();
      const parser = new Parser();
      const parsedSchema = await parser.parseYAMLFile(schemaPath);
      const validationResult = validator.validate(parsedSchema!);
      
      expect(validationResult.valid).toBe(true);
      
      // Verify it can be loaded
      const scanner = new YAMLScanner(tempDir);
      const schemas = await scanner.scanDirectory();
      
      const imported = schemas.find(s => s.id === 'import-test-api');
      expect(imported).toBeDefined();
      expect(imported!.metadata?.source).toBe('imported');
    });
  });

  describe('Complete End-to-End Workflow', () => {
    it('should handle multiple APIs with different sources', async () => {
      // Create APIs from different sources
      const apis: APISchema[] = [
        {
          id: 'manual-api',
          name: 'Manual API',
          version: '1.0.0',
          baseURL: 'https://manual.test',
          endpoints: [],
          metadata: { source: 'manual', createdAt: new Date().toISOString() },
        },
        {
          id: 'tested-api',
          name: 'Tested API',
          version: '1.0.0',
          baseURL: 'https://tested.test',
          endpoints: [
            { path: '/test', method: HTTPMethod.GET },
          ],
          metadata: {
            source: 'tested',
            createdAt: new Date().toISOString(),
            lastTestedAt: new Date().toISOString(),
            testResults: [{
              timestamp: new Date().toISOString(),
              endpoint: '/test',
              method: HTTPMethod.GET,
              statusCode: 200,
              responseTime: 100,
              success: true,
            }],
          },
        },
        {
          id: 'imported-api',
          name: 'Imported API',
          version: '2.0.0',
          baseURL: 'https://imported.test',
          endpoints: [
            { path: '/import', method: HTTPMethod.POST },
          ],
          metadata: {
            source: 'imported',
            createdAt: new Date().toISOString(),
            importedAt: new Date().toISOString(),
          },
        },
      ];

      // Save all APIs
      for (const api of apis) {
        const schemaPath = path.join(tempDir, `${api.id}.yaml`);
        await fs.writeFile(schemaPath, yaml.dump(api), 'utf-8');
      }

      // Load and verify all APIs
      const scanner = new YAMLScanner(tempDir);
      const schemas = await scanner.scanDirectory();
      
      expect(schemas).toHaveLength(3);
      
      // Verify each source type
      const manual = schemas.find(s => s.metadata?.source === 'manual');
      const tested = schemas.find(s => s.metadata?.source === 'tested');
      const imported = schemas.find(s => s.metadata?.source === 'imported');
      
      expect(manual).toBeDefined();
      expect(tested).toBeDefined();
      expect(imported).toBeDefined();
      
      // Verify test results exist for tested API
      expect(tested!.metadata?.testResults).toBeDefined();
      expect(tested!.metadata?.testResults!.length).toBeGreaterThan(0);
      
      // Validate all schemas
      const validator = new Validator();
      for (const schema of schemas) {
        const result = validator.validate(schema);
        expect(result.valid).toBe(true);
      }
    });
  });
});