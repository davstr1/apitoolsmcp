import { editCommand } from '../../../src/cli/commands/edit';
import * as inquirer from 'inquirer';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { getConfig } from '../../../src/config/loader';
import { YAMLScanner } from '../../../src/schemas/yaml-scanner';
import { Validator } from '../../../src/schemas/validator';
import { createTempDir, cleanupTempDir } from '../../setup';
import { APISchema, HTTPMethod } from '../../../src/types/api-schema';

jest.mock('inquirer', () => ({
  prompt: jest.fn(),
}));
jest.mock('../../../src/config/loader');
jest.mock('../../../src/schemas/yaml-scanner');
jest.mock('../../../src/schemas/validator');

describe('edit command', () => {
  const mockInquirer = inquirer as unknown as { prompt: jest.Mock };
  const mockGetConfig = getConfig as jest.MockedFunction<typeof getConfig>;
  const mockYAMLScanner = YAMLScanner as jest.MockedClass<typeof YAMLScanner>;
  const mockValidator = Validator as jest.MockedClass<typeof Validator>;
  
  let tempDir: string;
  let mockScanDirectory: jest.Mock;
  let mockValidate: jest.Mock;

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

    mockValidate = jest.fn();
    mockValidator.mockImplementation(() => ({
      validateSchema: mockValidate,
    } as any));
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should edit an existing API schema', async () => {
    const apiId = 'test-api';
    const originalSchema: APISchema = {
      id: apiId,
      name: 'Test API',
      version: '1.0.0',
      description: 'Original description',
      baseURL: 'https://api.test.com',
      endpoints: [],
    };

    // Create the schema file
    const schemaPath = path.join(tempDir, `${apiId}.yaml`);
    await fs.writeFile(schemaPath, yaml.dump(originalSchema), 'utf-8');

    mockScanDirectory.mockResolvedValue([originalSchema]);
    
    // Mock user edits
    mockInquirer.prompt.mockResolvedValue({
      name: 'Updated Test API',
      version: '2.0.0',
      description: 'Updated description',
      baseURL: 'https://api-v2.test.com',
    });

    mockValidate.mockReturnValue({ valid: true, errors: [] });

    await editCommand(apiId);

    // Read the updated file
    const updatedContent = await fs.readFile(schemaPath, 'utf-8');
    const updatedSchema = yaml.load(updatedContent) as APISchema;

    expect(updatedSchema.name).toBe('Updated Test API');
    expect(updatedSchema.version).toBe('2.0.0');
    expect(updatedSchema.description).toBe('Updated description');
    expect(updatedSchema.baseURL).toBe('https://api-v2.test.com');
    expect(updatedSchema.id).toBe(apiId); // ID should not change
  });

  it('should handle non-existent API ID', async () => {
    mockScanDirectory.mockResolvedValue([]);
    
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(editCommand('non-existent')).rejects.toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);
    
    mockExit.mockRestore();
  });

  it('should validate edited schema before saving', async () => {
    const apiId = 'test-api';
    const originalSchema: APISchema = {
      id: apiId,
      name: 'Test API',
      version: '1.0.0',
      baseURL: 'https://api.test.com',
      endpoints: [],
    };

    const schemaPath = path.join(tempDir, `${apiId}.yaml`);
    await fs.writeFile(schemaPath, yaml.dump(originalSchema), 'utf-8');

    mockScanDirectory.mockResolvedValue([originalSchema]);
    
    mockInquirer.prompt.mockResolvedValue({
      name: '',  // Invalid - empty name
      version: '2.0.0',
      description: 'Updated',
      baseURL: 'https://api.test.com',
    });

    mockValidate.mockReturnValue({
      valid: false,
      errors: [{ message: 'Name is required' }],
    });

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(editCommand(apiId)).rejects.toThrow('process.exit called');
    expect(mockValidate).toHaveBeenCalled();
    expect(mockExit).toHaveBeenCalledWith(1);
    
    mockExit.mockRestore();
  });

  it('should preserve endpoints and metadata when editing', async () => {
    const apiId = 'test-api';
    const originalSchema: APISchema = {
      id: apiId,
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
      metadata: {
        source: 'manual',
        createdAt: '2024-01-01T00:00:00Z',
      },
    };

    const schemaPath = path.join(tempDir, `${apiId}.yaml`);
    await fs.writeFile(schemaPath, yaml.dump(originalSchema), 'utf-8');

    mockScanDirectory.mockResolvedValue([originalSchema]);
    
    mockInquirer.prompt.mockResolvedValue({
      name: 'Updated API',
      version: '1.1.0',
      description: originalSchema.description,
      baseURL: originalSchema.baseURL,
    });

    mockValidate.mockReturnValue({ valid: true, errors: [] });

    await editCommand(apiId);

    const updatedContent = await fs.readFile(schemaPath, 'utf-8');
    const updatedSchema = yaml.load(updatedContent) as APISchema;

    expect(updatedSchema.endpoints).toEqual(originalSchema.endpoints);
    expect(updatedSchema.metadata?.source).toBe('manual');
    expect(updatedSchema.metadata?.createdAt).toBe('2024-01-01T00:00:00Z');
    expect(updatedSchema.metadata?.lastModified).toBeDefined();
  });

  it('should handle file system errors', async () => {
    const apiId = 'test-api';
    const schema: APISchema = {
      id: apiId,
      name: 'Test API',
      version: '1.0.0',
      baseURL: 'https://api.test.com',
      endpoints: [],
    };

    mockScanDirectory.mockResolvedValue([schema]);
    
    // File doesn't exist on disk even though scanner found it
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(editCommand(apiId)).rejects.toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);
    
    mockExit.mockRestore();
  });

  it('should handle user cancellation', async () => {
    const apiId = 'test-api';
    const schema: APISchema = {
      id: apiId,
      name: 'Test API',
      version: '1.0.0',
      baseURL: 'https://api.test.com',
      endpoints: [],
    };

    const schemaPath = path.join(tempDir, `${apiId}.yaml`);
    await fs.writeFile(schemaPath, yaml.dump(schema), 'utf-8');

    mockScanDirectory.mockResolvedValue([schema]);
    mockInquirer.prompt.mockRejectedValue(new Error('User force closed the prompt'));

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(editCommand(apiId)).rejects.toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);
    
    mockExit.mockRestore();
  });
});