import { addManualCommand } from '../../../src/cli/commands/add-manual';
import * as inquirer from 'inquirer';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { getConfig } from '../../../src/config/loader';
import { HTTPMethod } from '../../../src/types/api-schema';
import { createTempDir, cleanupTempDir } from '../../setup';

jest.mock('inquirer', () => ({
  prompt: jest.fn(),
}));
jest.mock('../../../src/config/loader');

describe('add-manual command', () => {
  const mockInquirer = inquirer as unknown as { prompt: jest.Mock };
  const mockGetConfig = getConfig as jest.MockedFunction<typeof getConfig>;
  let tempDir: string;

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = createTempDir();
    mockGetConfig.mockResolvedValue({
      schemaDirectory: tempDir,
      remoteImports: { enabled: true, cacheDuration: 3600000 },
      validation: { strict: true },
    });
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should create a basic API schema with one endpoint', async () => {
    mockInquirer.prompt
      .mockResolvedValueOnce({
        id: 'test-api',
        name: 'Test API',
        version: '1.0.0',
        description: 'Test description',
        baseURL: 'https://api.test.com',
      })
      .mockResolvedValueOnce({
        path: '/users',
        method: HTTPMethod.GET,
        description: 'Get all users',
      })
      .mockResolvedValueOnce({
        continueAdding: false,
      });

    await addManualCommand();

    const schemaPath = path.join(tempDir, 'test-api.yaml');
    const exists = await fs.access(schemaPath).then(() => true).catch(() => false);
    expect(exists).toBe(true);

    const content = await fs.readFile(schemaPath, 'utf-8');
    const schema = yaml.load(content) as any;

    expect(schema.id).toBe('test-api');
    expect(schema.name).toBe('Test API');
    expect(schema.version).toBe('1.0.0');
    expect(schema.description).toBe('Test description');
    expect(schema.baseURL).toBe('https://api.test.com');
    expect(schema.endpoints).toHaveLength(1);
    expect(schema.endpoints[0].path).toBe('/users');
    expect(schema.endpoints[0].method).toBe(HTTPMethod.GET);
    expect(schema.metadata.source).toBe('manual');
    expect(schema.metadata.createdAt).toBeDefined();
  });

  it('should create API schema with multiple endpoints', async () => {
    mockInquirer.prompt
      .mockResolvedValueOnce({
        id: 'multi-api',
        name: 'Multi API',
        version: '2.0.0',
        description: '',
        baseURL: 'https://multi.test.com',
      })
      .mockResolvedValueOnce({
        path: '/users',
        method: HTTPMethod.GET,
        description: 'Get users',
      })
      .mockResolvedValueOnce({
        continueAdding: true,
      })
      .mockResolvedValueOnce({
        path: '/users/{id}',
        method: HTTPMethod.PUT,
        description: 'Update user',
      })
      .mockResolvedValueOnce({
        continueAdding: false,
      });

    await addManualCommand();

    const schemaPath = path.join(tempDir, 'multi-api.yaml');
    const content = await fs.readFile(schemaPath, 'utf-8');
    const schema = yaml.load(content) as any;

    expect(schema.endpoints).toHaveLength(2);
    expect(schema.endpoints[0].path).toBe('/users');
    expect(schema.endpoints[1].path).toBe('/users/{id}');
    expect(schema.endpoints[1].method).toBe(HTTPMethod.PUT);
  });

  it('should validate required fields', async () => {
    mockInquirer.prompt.mockResolvedValueOnce({
      id: '',
      name: 'Test API',
      version: '1.0.0',
      description: '',
      baseURL: 'https://api.test.com',
    });

    // The validation should be handled by inquirer's validate function
    // Let's test that validate functions are passed correctly
    const promptCall = mockInquirer.prompt.mock.calls[0];
    const idPrompt = (promptCall[0] as any[]).find((p: any) => p.name === 'id');
    
    expect(idPrompt.validate('')).toBe('API ID is required');
    expect(idPrompt.validate('valid-id')).toBe(true);
  });

  it('should handle file system errors', async () => {
    mockGetConfig.mockResolvedValue({
      schemaDirectory: '/invalid/path/that/does/not/exist',
      remoteImports: { enabled: true, cacheDuration: 3600000 },
      validation: { strict: true },
    });

    mockInquirer.prompt
      .mockResolvedValueOnce({
        id: 'test-api',
        name: 'Test API',
        version: '1.0.0',
        description: '',
        baseURL: 'https://api.test.com',
      })
      .mockResolvedValueOnce({
        path: '/test',
        method: HTTPMethod.GET,
        description: '',
      })
      .mockResolvedValueOnce({
        continueAdding: false,
      });

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(addManualCommand()).rejects.toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);
    
    mockExit.mockRestore();
  });

  it('should handle user cancellation gracefully', async () => {
    mockInquirer.prompt.mockRejectedValueOnce(new Error('User force closed the prompt'));

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(addManualCommand()).rejects.toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);
    
    mockExit.mockRestore();
  });

  it('should set undefined for empty optional fields', async () => {
    mockInquirer.prompt
      .mockResolvedValueOnce({
        id: 'minimal-api',
        name: 'Minimal API',
        version: '1.0.0',
        description: '', // Empty description
        baseURL: 'https://minimal.test.com',
      })
      .mockResolvedValueOnce({
        path: '/test',
        method: HTTPMethod.GET,
        description: '', // Empty endpoint description
      })
      .mockResolvedValueOnce({
        continueAdding: false,
      });

    await addManualCommand();

    const schemaPath = path.join(tempDir, 'minimal-api.yaml');
    const content = await fs.readFile(schemaPath, 'utf-8');
    const schema = yaml.load(content) as any;

    expect(schema.description).toBeUndefined();
    expect(schema.endpoints[0].description).toBe('');
  });
});