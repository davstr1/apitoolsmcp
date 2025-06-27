import { validateCommand } from '../../../src/cli/commands/validate';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { getConfig } from '../../../src/config/loader';
import { Validator } from '../../../src/schemas/validator';
import { Parser } from '../../../src/schemas/parser';
import { createTempDir, cleanupTempDir } from '../../setup';
import { APISchema, HTTPMethod } from '../../../src/types/api-schema';

jest.mock('../../../src/config/loader');
jest.mock('../../../src/schemas/validator');
jest.mock('../../../src/schemas/parser');

// Mock process.exit to prevent Jest from actually exiting
jest.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
  throw new Error(`process.exit called with code ${code}`);
});

describe('validate command', () => {
  const mockGetConfig = getConfig as jest.MockedFunction<typeof getConfig>;
  const mockValidator = Validator as jest.MockedClass<typeof Validator>;
  const mockParser = Parser as jest.MockedClass<typeof Parser>;
  
  let tempDir: string;
  let mockValidate: jest.Mock;
  let mockParseYAMLFile: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = createTempDir();
    
    mockGetConfig.mockResolvedValue({
      schemaDirectory: tempDir,
      remoteImports: { enabled: true, cacheDuration: 3600000 },
      validation: { strict: true },
    });

    mockValidate = jest.fn();
    mockParseYAMLFile = jest.fn();
    
    mockValidator.mockImplementation(() => ({
      validate: mockValidate,
    } as any));
    
    mockParser.mockImplementation(() => ({
      parseYAMLFile: mockParseYAMLFile,
    } as any));
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  it('should validate all schemas in directory when no path provided', async () => {
    const schema1: APISchema = {
      id: 'api-1',
      name: 'API 1',
      version: '1.0.0',
      baseURL: 'https://api1.test.com',
      endpoints: [],
    };

    const schema2: APISchema = {
      id: 'api-2',
      name: 'API 2',
      version: '1.0.0',
      baseURL: 'https://api2.test.com',
      endpoints: [],
    };

    await fs.writeFile(
      path.join(tempDir, 'api-1.yaml'),
      yaml.dump(schema1),
      'utf-8'
    );
    await fs.writeFile(
      path.join(tempDir, 'api-2.yaml'),
      yaml.dump(schema2),
      'utf-8'
    );

    mockParseYAMLFile
      .mockResolvedValueOnce(schema1)
      .mockResolvedValueOnce(schema2);
    mockValidate.mockReturnValue({ valid: true, errors: [] });

    await expect(validateCommand()).rejects.toThrow('process.exit called with code 0');

    expect(mockParseYAMLFile).toHaveBeenCalledTimes(2);
    expect(mockValidate).toHaveBeenCalledTimes(2);
    expect(mockValidate).toHaveBeenCalledWith(schema1);
    expect(mockValidate).toHaveBeenCalledWith(schema2);
  });

  it('should validate a specific file when path provided', async () => {
    const schema: APISchema = {
      id: 'test-api',
      name: 'Test API',
      version: '1.0.0',
      baseURL: 'https://api.test.com',
      endpoints: [
        {
          path: '/users',
          method: HTTPMethod.GET,
        },
      ],
    };

    const schemaPath = path.join(tempDir, 'test-api.yaml');
    await fs.writeFile(schemaPath, yaml.dump(schema), 'utf-8');

    mockParseYAMLFile.mockResolvedValue(schema);
    mockValidate.mockReturnValue({ valid: true, errors: [] });

    await expect(validateCommand(schemaPath)).rejects.toThrow('process.exit called with code 0');

    expect(mockParseYAMLFile).toHaveBeenCalledTimes(1);
    expect(mockParseYAMLFile).toHaveBeenCalledWith(schemaPath);
    expect(mockValidate).toHaveBeenCalledWith(schema);
  });

  it('should handle validation errors', async () => {
    const schema: APISchema = {
      id: 'invalid-api',
      name: '',  // Invalid - empty name
      version: '1.0.0',
      baseURL: 'not-a-url',  // Invalid URL
      endpoints: [],
    };

    const schemaPath = path.join(tempDir, 'invalid-api.yaml');
    await fs.writeFile(schemaPath, yaml.dump(schema), 'utf-8');

    mockParseYAMLFile.mockResolvedValue(schema);
    mockValidate.mockReturnValue({
      valid: false,
      errors: [
        'name must not be empty',
        'baseURL must be a valid URL',
      ],
    });

    await expect(validateCommand(schemaPath)).rejects.toThrow('process.exit called with code 1');

    expect(mockValidate).toHaveBeenCalledWith(schema);
  });

  it('should handle parse errors', async () => {
    const schemaPath = path.join(tempDir, 'broken.yaml');
    await fs.writeFile(schemaPath, 'invalid: yaml: : :', 'utf-8');

    mockParseYAMLFile.mockResolvedValue(null);

    await expect(validateCommand(schemaPath)).rejects.toThrow('process.exit called with code 1');

    expect(mockParseYAMLFile).toHaveBeenCalledWith(schemaPath);
    expect(mockValidate).not.toHaveBeenCalled();
  });

  it('should handle empty directory', async () => {
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

    await expect(validateCommand()).rejects.toThrow('process.exit called with code 0');

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('No YAML files found to validate')
    );

    consoleLogSpy.mockRestore();
  });

  it('should handle non-existent path', async () => {
    const nonExistentPath = path.join(tempDir, 'non-existent.yaml');

    await expect(validateCommand(nonExistentPath)).rejects.toThrow('process.exit called with code 1');
  });

  it('should validate nested directories', async () => {
    const schema: APISchema = {
      id: 'nested-api',
      name: 'Nested API',
      version: '1.0.0',
      baseURL: 'https://api.test.com',
      endpoints: [],
    };

    const nestedDir = path.join(tempDir, 'apis', 'v1');
    await fs.mkdir(nestedDir, { recursive: true });
    
    const schemaPath = path.join(nestedDir, 'nested-api.yaml');
    await fs.writeFile(schemaPath, yaml.dump(schema), 'utf-8');

    mockParseYAMLFile.mockResolvedValue(schema);
    mockValidate.mockReturnValue({ valid: true, errors: [] });

    await expect(validateCommand()).rejects.toThrow('process.exit called with code 0');

    expect(mockParseYAMLFile).toHaveBeenCalledWith(schemaPath);
  });

  it('should handle both .yaml and .yml extensions', async () => {
    const schema1: APISchema = {
      id: 'yaml-ext',
      name: 'YAML Extension',
      version: '1.0.0',
      baseURL: 'https://api.test.com',
      endpoints: [],
    };

    const schema2: APISchema = {
      id: 'yml-ext',
      name: 'YML Extension',
      version: '1.0.0',
      baseURL: 'https://api.test.com',
      endpoints: [],
    };

    await fs.writeFile(
      path.join(tempDir, 'api.yaml'),
      yaml.dump(schema1),
      'utf-8'
    );
    await fs.writeFile(
      path.join(tempDir, 'api.yml'),
      yaml.dump(schema2),
      'utf-8'
    );

    mockParseYAMLFile
      .mockResolvedValueOnce(schema1)
      .mockResolvedValueOnce(schema2);
    mockValidate.mockReturnValue({ valid: true, errors: [] });

    await expect(validateCommand()).rejects.toThrow('process.exit called with code 0');

    expect(mockParseYAMLFile).toHaveBeenCalledTimes(2);
  });
});