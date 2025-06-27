import { importCommand } from '../../../src/cli/commands/import';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { getConfig } from '../../../src/config/loader';
import { OpenAPIImporter } from '../../../src/services/openapi-importer';
import { Validator } from '../../../src/schemas/validator';
import { createTempDir, cleanupTempDir } from '../../setup';
import { APISchema, HTTPMethod } from '../../../src/types/api-schema';
import fetch from 'node-fetch';

jest.mock('../../../src/config/loader');
jest.mock('../../../src/services/openapi-importer');
jest.mock('../../../src/schemas/validator');
jest.mock('node-fetch');

// Mock process.exit to prevent Jest from actually exiting
jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
  throw new Error(`process.exit called with code ${code}`);
});

describe('import command', () => {
  const mockGetConfig = getConfig as jest.MockedFunction<typeof getConfig>;
  const mockOpenAPIImporter = OpenAPIImporter as jest.MockedClass<typeof OpenAPIImporter>;
  const mockValidator = Validator as jest.MockedClass<typeof Validator>;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;
  
  let tempDir: string;
  let mockImportFromFile: jest.Mock;
  let mockValidateSchema: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = createTempDir();
    
    mockGetConfig.mockResolvedValue({
      schemaDirectory: tempDir,
      remoteImports: { enabled: true, cacheDuration: 3600000 },
      validation: { strict: true },
    });

    mockImportFromFile = jest.fn();
    mockOpenAPIImporter.mockImplementation(() => ({
      importFromFile: mockImportFromFile,
    } as any));

    mockValidateSchema = jest.fn();
    mockValidator.mockImplementation(() => ({
      validate: mockValidateSchema,
    } as any));
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should import OpenAPI spec from local file', async () => {
    const openApiPath = path.join(tempDir, 'openapi.json');
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
            responses: {
              '200': { description: 'Success' },
            },
          },
        },
      },
    };

    await fs.writeFile(openApiPath, JSON.stringify(openApiSpec), 'utf-8');

    const importedSchema: APISchema = {
      id: 'test-api',
      name: 'Test API',
      version: '1.0.0',
      description: 'Test API description',
      baseURL: 'https://api.test.com',
      endpoints: [
        {
          path: '/users',
          method: HTTPMethod.GET,
          description: 'Get users',
        },
      ],
      metadata: {
        source: 'imported',
        sourceFile: openApiPath,
      },
    };

    mockImportFromFile.mockResolvedValue(importedSchema);
    mockValidateSchema.mockReturnValue({ valid: true, errors: [] });

    await importCommand(openApiPath, {});

    expect(mockImportFromFile).toHaveBeenCalledWith(openApiPath);
    expect(mockValidateSchema).toHaveBeenCalledWith(importedSchema);

    // Check that the schema was saved
    const savedPath = path.join(tempDir, 'test-api.yaml');
    const exists = await fs.access(savedPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('should import OpenAPI spec from URL', async () => {
    const url = 'https://api.example.com/openapi.json';
    const openApiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Remote API',
        version: '2.0.0',
      },
      servers: [{ url: 'https://api.example.com' }],
      paths: {},
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => openApiSpec,
    } as any);

    const importedSchema: APISchema = {
      id: 'remote-api',
      name: 'Remote API',
      version: '2.0.0',
      baseURL: 'https://api.example.com',
      endpoints: [],
      metadata: {
        source: 'imported',
        sourceFile: expect.stringContaining('remote-api-'),
      },
    };

    mockImportFromFile.mockResolvedValue(importedSchema);
    mockValidateSchema.mockReturnValue({ valid: true, errors: [] });

    await importCommand(url, {});

    expect(mockFetch).toHaveBeenCalledWith(url);
    expect(mockImportFromFile).toHaveBeenCalled();
    
    // The file should be cached locally
    const importCall = mockImportFromFile.mock.calls[0];
    expect(importCall[0]).toMatch(/remote-api-.*\.json$/);
  });

  it('should use custom name when provided', async () => {
    const openApiPath = path.join(tempDir, 'openapi.yaml');
    const openApiSpec = {
      swagger: '2.0',
      info: {
        title: 'Original Name',
        version: '1.0.0',
      },
      host: 'api.test.com',
      basePath: '/v1',
      paths: {},
    };

    await fs.writeFile(openApiPath, yaml.dump(openApiSpec), 'utf-8');

    const importedSchema: APISchema = {
      id: 'custom-api',
      name: 'Custom API Name', // Should use custom name
      version: '1.0.0',
      baseURL: 'https://api.test.com/v1',
      endpoints: [],
      metadata: {
        source: 'imported',
        sourceFile: openApiPath,
      },
    };

    mockImportFromFile.mockResolvedValue(importedSchema);
    mockValidateSchema.mockReturnValue({ valid: true, errors: [] });

    await importCommand(openApiPath, { name: 'Custom API Name' });

    // Check that custom name was used
    const savedPath = path.join(tempDir, 'custom-api.yaml');
    const content = await fs.readFile(savedPath, 'utf-8');
    const saved = yaml.load(content) as APISchema;
    expect(saved.name).toBe('Custom API Name');
  });

  it('should handle remote imports disabled', async () => {
    mockGetConfig.mockResolvedValue({
      schemaDirectory: tempDir,
      remoteImports: { enabled: false, cacheDuration: 3600000 },
      validation: { strict: true },
    });

    const url = 'https://api.example.com/openapi.json';
    
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(importCommand(url, {})).rejects.toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockFetch).not.toHaveBeenCalled();
    
    mockExit.mockRestore();
  });

  it('should handle fetch errors', async () => {
    const url = 'https://api.example.com/openapi.json';
    
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as any);

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(importCommand(url, {})).rejects.toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);
    
    mockExit.mockRestore();
  });

  it('should handle invalid OpenAPI spec', async () => {
    const openApiPath = path.join(tempDir, 'invalid.json');
    await fs.writeFile(openApiPath, JSON.stringify({ invalid: 'spec' }), 'utf-8');

    mockImportFromFile.mockRejectedValue(new Error('Not a valid OpenAPI specification'));

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(importCommand(openApiPath, {})).rejects.toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);
    
    mockExit.mockRestore();
  });

  it('should handle validation errors', async () => {
    const openApiPath = path.join(tempDir, 'openapi.json');
    const openApiSpec = {
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {},
    };

    await fs.writeFile(openApiPath, JSON.stringify(openApiSpec), 'utf-8');

    const importedSchema: APISchema = {
      id: 'test',
      name: 'Test',
      version: '1.0.0',
      baseURL: '', // Invalid - empty baseURL
      endpoints: [],
    };

    mockImportFromFile.mockResolvedValue(importedSchema);
    mockValidateSchema.mockReturnValue({
      valid: false,
      errors: [{ message: 'baseURL must not be empty' }],
    });

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(importCommand(openApiPath, {})).rejects.toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);
    
    mockExit.mockRestore();
  });

  it('should handle file not found', async () => {
    const nonExistentPath = '/path/to/non-existent.yaml';
    
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(importCommand(nonExistentPath, {})).rejects.toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);
    
    mockExit.mockRestore();
  });

  it('should cache remote files with proper naming', async () => {
    const url = 'https://petstore.swagger.io/v2/swagger.json';
    const openApiSpec = {
      swagger: '2.0',
      info: { title: 'Swagger Petstore', version: '1.0.0' },
      host: 'petstore.swagger.io',
      basePath: '/v2',
      paths: {},
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => openApiSpec,
    } as any);

    const importedSchema: APISchema = {
      id: 'swagger-petstore',
      name: 'Swagger Petstore',
      version: '1.0.0',
      baseURL: 'https://petstore.swagger.io/v2',
      endpoints: [],
    };

    mockImportFromFile.mockResolvedValue(importedSchema);
    mockValidateSchema.mockReturnValue({ valid: true, errors: [] });

    await importCommand(url, {});

    // Check cache file naming
    const importCall = mockImportFromFile.mock.calls[0];
    const cachedPath = importCall[0];
    expect(cachedPath).toMatch(/swagger-petstore-\d+\.json$/);
  });
});