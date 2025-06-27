import { addFromUrlCommand } from '../../../src/cli/commands/add-from-url';
import * as inquirer from 'inquirer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getConfig } from '../../../src/config/loader';
import { ApiTester } from '../../../src/services/api-tester';
import { ResponseAnalyzer } from '../../../src/services/response-analyzer';
import { SchemaGenerator } from '../../../src/services/schema-generator';
import { buildParameters } from '../../../src/cli/utils/parameter-builder';
import { createTempDir, cleanupTempDir } from '../../setup';
import { HttpMethod } from '../../../src/types/http';
import { HTTPMethod } from '../../../src/types/api-schema';

jest.mock('inquirer');
jest.mock('../../../src/config/loader');
jest.mock('../../../src/services/api-tester');
jest.mock('../../../src/services/response-analyzer');
jest.mock('../../../src/services/schema-generator');
jest.mock('../../../src/cli/utils/parameter-builder');

describe('add-from-url command', () => {
  const mockInquirer = inquirer as jest.Mocked<typeof inquirer>;
  const mockGetConfig = getConfig as jest.MockedFunction<typeof getConfig>;
  const mockBuildParameters = buildParameters as jest.MockedFunction<typeof buildParameters>;
  
  let mockApiTester: jest.Mocked<ApiTester>;
  let mockResponseAnalyzer: jest.Mocked<ResponseAnalyzer>;
  let mockSchemaGenerator: jest.Mocked<SchemaGenerator>;
  let tempDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = createTempDir();
    
    mockGetConfig.mockResolvedValue({
      schemaDirectory: tempDir,
      remoteImports: { enabled: true, cacheDuration: 3600000 },
      validation: { strict: true },
    });

    mockApiTester = {
      executeRequest: jest.fn(),
    } as any;
    (ApiTester as jest.MockedClass<typeof ApiTester>).mockImplementation(() => mockApiTester);

    mockResponseAnalyzer = {
      analyze: jest.fn(),
    } as any;
    (ResponseAnalyzer as jest.MockedClass<typeof ResponseAnalyzer>).mockImplementation(() => mockResponseAnalyzer);

    mockSchemaGenerator = {
      generate: jest.fn(),
      generateBasic: jest.fn(),
    } as any;
    (SchemaGenerator as jest.MockedClass<typeof SchemaGenerator>).mockImplementation(() => mockSchemaGenerator);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should create API schema from successful test request', async () => {
    const testUrl = 'https://api.example.com/users?page=1';
    const mockResponse = {
      success: true,
      request: {
        url: testUrl,
        method: HTTPMethod.GET,
        headers: {},
      },
      response: {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: { users: [] },
        responseTime: 150,
      },
      timestamp: new Date().toISOString(),
    };

    const mockAnalysis = {
      contentType: 'application/json',
      dataType: 'json' as const,
      structure: { type: 'object', properties: { users: { type: 'array' } } },
      hasArray: true,
      hasObject: true,
    };

    const mockSchema = {
      id: 'example-api',
      name: 'Example API',
      version: '1.0.0',
      baseURL: 'https://api.example.com',
      endpoints: [{
        path: '/users',
        method: HTTPMethod.GET,
        parameters: [{ name: 'page', type: 'number' as const, required: false }],
      }],
      metadata: {
        source: 'tested',
        createdAt: new Date().toISOString(),
      },
    };

    // Mock user inputs
    mockInquirer.prompt
      .mockResolvedValueOnce({ apiUrl: testUrl })
      .mockResolvedValueOnce({
        id: 'example-api',
        name: 'Example API',
        description: 'Test API',
      })
      .mockResolvedValueOnce({ method: 'GET' })
      .mockResolvedValueOnce({ useCommonHeaders: [] })
      .mockResolvedValueOnce({ addCustom: false })
      .mockResolvedValueOnce({ confirmTest: true })
      .mockResolvedValueOnce({ confirmSave: true });

    mockBuildParameters.mockResolvedValue([
      {
        name: 'page',
        value: '1',
        type: 'number',
        required: false,
        location: 'query',
      },
    ]);

    mockApiTester.executeRequest.mockResolvedValue(mockResponse);
    mockResponseAnalyzer.analyze.mockResolvedValue(mockAnalysis);
    mockSchemaGenerator.generate.mockResolvedValue(mockSchema);

    await addFromUrlCommand();

    expect(mockApiTester.executeRequest).toHaveBeenCalledWith({
      url: testUrl,
      method: HttpMethod.GET,
      headers: {},
      params: { page: '1' },
    });

    const schemaPath = path.join(tempDir, 'example-api.yaml');
    const exists = await fs.access(schemaPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it('should handle failed test request', async () => {
    const testUrl = 'https://api.example.com/invalid';
    const mockError = {
      success: false,
      error: 'Request failed with status 404',
    };

    const mockBasicSchema = {
      id: 'example-api',
      name: 'Example API',
      version: '1.0.0',
      baseURL: 'https://api.example.com',
      endpoints: [{
        path: '/invalid',
        method: HTTPMethod.GET,
      }],
    };

    mockInquirer.prompt
      .mockResolvedValueOnce({ apiUrl: testUrl })
      .mockResolvedValueOnce({
        id: 'example-api',
        name: 'Example API',
        description: '',
      })
      .mockResolvedValueOnce({ method: 'GET' })
      .mockResolvedValueOnce({ useCommonHeaders: [] })
      .mockResolvedValueOnce({ addCustom: false })
      .mockResolvedValueOnce({ confirmTest: true })
      .mockResolvedValueOnce({ confirmSave: true });

    mockBuildParameters.mockResolvedValue([]);
    mockApiTester.executeRequest.mockResolvedValue(mockError as any);
    mockSchemaGenerator.generateBasic.mockResolvedValue(mockBasicSchema);

    await addFromUrlCommand();

    expect(mockSchemaGenerator.generateBasic).toHaveBeenCalled();
    expect(mockSchemaGenerator.generate).not.toHaveBeenCalled();
  });

  it('should validate URL input', async () => {
    mockInquirer.prompt.mockResolvedValueOnce({ apiUrl: 'invalid-url' });

    // Test the URL validation function
    const promptCall = mockInquirer.prompt.mock.calls[0];
    const urlPrompt = (promptCall[0] as any[]).find((p: any) => p.name === 'apiUrl');
    
    expect(urlPrompt.validate('invalid-url')).toBe('Please enter a valid URL');
    expect(urlPrompt.validate('https://api.example.com')).toBe(true);
  });

  it('should handle custom headers', async () => {
    const testUrl = 'https://api.example.com/users';

    mockInquirer.prompt
      .mockResolvedValueOnce({ apiUrl: testUrl })
      .mockResolvedValueOnce({
        id: 'example-api',
        name: 'Example API',
        description: '',
      })
      .mockResolvedValueOnce({ method: 'GET' })
      .mockResolvedValueOnce({ useCommonHeaders: ['Authorization'] })
      .mockResolvedValueOnce({ value: 'Bearer token123' })
      .mockResolvedValueOnce({ addCustom: true })
      .mockResolvedValueOnce({ name: 'X-Custom-Header', value: 'custom-value' })
      .mockResolvedValueOnce({ addCustom: false })
      .mockResolvedValueOnce({ confirmTest: false })
      .mockResolvedValueOnce({ confirmSave: false });

    mockBuildParameters.mockResolvedValue([]);
    mockSchemaGenerator.generateBasic.mockResolvedValue({} as any);

    await addFromUrlCommand();

    const generateCall = mockSchemaGenerator.generateBasic.mock.calls[0][0];
    expect(generateCall.headers).toEqual({
      'Authorization': 'Bearer token123',
      'X-Custom-Header': 'custom-value',
    });
  });

  it('should skip test if user declines', async () => {
    const testUrl = 'https://api.example.com/users';

    mockInquirer.prompt
      .mockResolvedValueOnce({ apiUrl: testUrl })
      .mockResolvedValueOnce({
        id: 'example-api',
        name: 'Example API',
        description: '',
      })
      .mockResolvedValueOnce({ method: HttpMethod.POST })
      .mockResolvedValueOnce({ useCommonHeaders: [] })
      .mockResolvedValueOnce({ addCustom: false })
      .mockResolvedValueOnce({ confirmTest: false })
      .mockResolvedValueOnce({ confirmSave: false });

    mockBuildParameters.mockResolvedValue([]);
    mockSchemaGenerator.generateBasic.mockResolvedValue({} as any);

    await addFromUrlCommand();

    expect(mockApiTester.executeRequest).not.toHaveBeenCalled();
    expect(mockSchemaGenerator.generateBasic).toHaveBeenCalled();
  });

  it('should handle user cancellation', async () => {
    mockInquirer.prompt.mockRejectedValueOnce(new Error('User force closed the prompt'));

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(addFromUrlCommand()).rejects.toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);
    
    mockExit.mockRestore();
  });
});