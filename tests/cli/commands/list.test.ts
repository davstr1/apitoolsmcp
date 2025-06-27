import { listCommand } from '../../../src/cli/commands/list';
import * as inquirer from 'inquirer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getConfig } from '../../../src/config/loader';
import { YAMLScanner } from '../../../src/schemas/yaml-scanner';
import { OpenAPIScanner } from '../../../src/services/openapi-scanner';
import { ApiTester } from '../../../src/services/api-tester';
import { createTempDir, cleanupTempDir } from '../../setup';
import { APISchema, HTTPMethod } from '../../../src/types/api-schema';

jest.mock('inquirer', () => ({
  prompt: jest.fn(),
}));
jest.mock('../../../src/config/loader');
jest.mock('../../../src/schemas/yaml-scanner');
jest.mock('../../../src/services/openapi-scanner');
jest.mock('../../../src/services/api-tester');

describe('list command', () => {
  const mockInquirer = inquirer as unknown as { prompt: jest.Mock };
  const mockGetConfig = getConfig as jest.MockedFunction<typeof getConfig>;
  const mockYAMLScanner = YAMLScanner as jest.MockedClass<typeof YAMLScanner>;
  const mockOpenAPIScanner = OpenAPIScanner as jest.MockedClass<typeof OpenAPIScanner>;
  const mockApiTester = ApiTester as jest.MockedClass<typeof ApiTester>;
  
  let tempDir: string;
  let mockScanDirectory: jest.Mock;
  let mockOpenAPIScan: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = createTempDir();
    
    mockGetConfig.mockResolvedValue({
      schemaDirectory: tempDir,
      remoteImports: { enabled: true, cacheDuration: 3600000 },
      validation: { strict: true },
    });

    mockScanDirectory = jest.fn();
    mockYAMLScanner.mockImplementation(() => ({
      scanDirectory: mockScanDirectory,
    } as any));

    mockOpenAPIScan = jest.fn();
    mockOpenAPIScanner.mockImplementation(() => ({
      scan: mockOpenAPIScan,
    } as any));
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should list all API schemas', async () => {
    const mockSchemas: APISchema[] = [
      {
        id: 'test-api',
        name: 'Test API',
        version: '1.0.0',
        description: 'Test description',
        baseURL: 'https://api.test.com',
        endpoints: [
          {
            path: '/users',
            method: HTTPMethod.GET,
            description: 'Get users',
          },
        ],
        metadata: {
          source: 'manual',
          createdAt: '2024-01-01T00:00:00Z',
        },
      },
    ];

    mockScanDirectory.mockResolvedValue(mockSchemas);
    
    await listCommand({});

    expect(mockScanDirectory).toHaveBeenCalledTimes(1);
  });

  it('should filter schemas based on search query', async () => {
    const mockSchemas: APISchema[] = [
      {
        id: 'user-api',
        name: 'User API',
        version: '1.0.0',
        baseURL: 'https://api.test.com',
        endpoints: [],
      },
      {
        id: 'product-api',
        name: 'Product API',
        version: '1.0.0',
        description: 'Product management',
        baseURL: 'https://api.test.com',
        endpoints: [],
      },
    ];

    mockScanDirectory.mockResolvedValue(mockSchemas);
    
    await listCommand({ search: 'user' });

    expect(mockScanDirectory).toHaveBeenCalledTimes(1);
    // The filtering happens in the command itself
  });

  it('should scan for OpenAPI specs when no schemas found', async () => {
    mockScanDirectory.mockResolvedValue([]);
    mockOpenAPIScan.mockResolvedValue([
      {
        path: '/project/openapi.yaml',
        title: 'My API',
        version: '3.0.0',
        description: 'API description',
      },
    ]);
    
    mockInquirer.prompt.mockResolvedValue({ importNow: true });

    await listCommand({});

    expect(mockOpenAPIScan).toHaveBeenCalledTimes(1);
    expect(mockInquirer.prompt).toHaveBeenCalledWith([
      {
        type: 'confirm',
        name: 'importNow',
        message: 'Would you like to import these OpenAPI specifications?',
        default: true,
      },
    ]);
  });

  it('should handle test flag and run quick test', async () => {
    const mockSchema: APISchema = {
      id: 'test-api',
      name: 'Test API',
      version: '1.0.0',
      baseURL: 'https://api.test.com',
      endpoints: [
        {
          path: '/users',
          method: HTTPMethod.GET,
          description: 'Get users',
        },
      ],
      metadata: {},
    };

    mockScanDirectory.mockResolvedValue([mockSchema]);
    mockInquirer.prompt
      .mockResolvedValueOnce({ selectedApi: mockSchema })
      .mockResolvedValueOnce({ selectedEndpoint: mockSchema.endpoints[0] });

    const mockTesterInstance = {
      executeRequest: jest.fn().mockResolvedValue({
        response: {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          body: { users: [] },
          responseTime: 100,
        },
      }),
    };
    mockApiTester.mockImplementation(() => mockTesterInstance as any);

    await listCommand({ test: true });

    expect(mockInquirer.prompt).toHaveBeenCalledTimes(2);
    expect(mockTesterInstance.executeRequest).toHaveBeenCalled();

    // Check that the schema file was updated with test results
    const schemaPath = path.join(tempDir, 'test-api.yaml');
    const exists = await fs.access(schemaPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('should handle API with no endpoints when testing', async () => {
    const mockSchema: APISchema = {
      id: 'empty-api',
      name: 'Empty API',
      version: '1.0.0',
      baseURL: 'https://api.test.com',
      endpoints: [],
    };

    mockScanDirectory.mockResolvedValue([mockSchema]);
    mockInquirer.prompt.mockResolvedValueOnce({ selectedApi: mockSchema });

    await listCommand({ test: true });

    expect(mockInquirer.prompt).toHaveBeenCalledTimes(1);
    // Should not prompt for endpoint selection
  });

  it('should display enhanced metadata', async () => {
    const mockSchema: APISchema = {
      id: 'test-api',
      name: 'Test API',
      version: '1.0.0',
      baseURL: 'https://api.test.com',
      endpoints: [],
      metadata: {
        source: 'tested',
        createdAt: '2024-01-01T00:00:00Z',
        lastTestedAt: new Date().toISOString(),
        testResults: [
          {
            timestamp: new Date().toISOString(),
            endpoint: '/users',
            method: HTTPMethod.GET,
            statusCode: 200,
            responseTime: 100,
            success: true,
          },
          {
            timestamp: new Date().toISOString(),
            endpoint: '/users',
            method: HTTPMethod.GET,
            statusCode: 500,
            responseTime: 50,
            success: false,
          },
        ],
      },
    };

    mockScanDirectory.mockResolvedValue([mockSchema]);
    
    await listCommand({});

    expect(mockScanDirectory).toHaveBeenCalledTimes(1);
    // The display happens via console.log which is mocked
  });

  it('should handle errors gracefully', async () => {
    mockScanDirectory.mockRejectedValue(new Error('Scanner error'));
    
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(listCommand({})).rejects.toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);
    
    mockExit.mockRestore();
  });
});