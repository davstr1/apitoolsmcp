import { validateCommand } from '../../../src/cli/commands/validate';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { getConfig } from '../../../src/config/loader';
import { Validator } from '../../../src/schemas/validator';
import { createTempDir, cleanupTempDir } from '../../setup';
import { APISchema, HTTPMethod } from '../../../src/types/api-schema';

jest.mock('../../../src/config/loader');
jest.mock('../../../src/schemas/validator');

describe('validate command', () => {
  const mockGetConfig = getConfig as jest.MockedFunction<typeof getConfig>;
  const mockValidator = Validator as jest.MockedClass<typeof Validator>;
  
  let tempDir: string;
  let mockValidateSchema: jest.Mock;
  let mockValidateFile: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    tempDir = createTempDir();
    
    mockGetConfig.mockResolvedValue({
      schemaDirectory: tempDir,
      remoteImports: { enabled: true, cacheDuration: 3600000 },
      validation: { strict: true },
    });

    mockValidateSchema = jest.fn();
    mockValidateFile = jest.fn();
    
    mockValidator.mockImplementation(() => ({
      validateSchema: mockValidateSchema,
      validateFile: mockValidateFile,
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

    mockValidateFile.mockReturnValue({ valid: true, errors: [] });

    await validateCommand();

    expect(mockValidateFile).toHaveBeenCalledTimes(2);
    expect(mockValidateFile).toHaveBeenCalledWith(path.join(tempDir, 'api-1.yaml'));
    expect(mockValidateFile).toHaveBeenCalledWith(path.join(tempDir, 'api-2.yaml'));
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

    mockValidateFile.mockReturnValue({ valid: true, errors: [] });

    await validateCommand(schemaPath);

    expect(mockValidateFile).toHaveBeenCalledTimes(1);
    expect(mockValidateFile).toHaveBeenCalledWith(schemaPath);
  });

  it('should report validation errors', async () => {
    const invalidSchema = {
      // Missing required fields
      name: 'Invalid API',
      endpoints: [],
    };

    const schemaPath = path.join(tempDir, 'invalid.yaml');
    await fs.writeFile(schemaPath, yaml.dump(invalidSchema), 'utf-8');

    mockValidateFile.mockReturnValue({
      valid: false,
      errors: [
        { message: "must have required property 'id'" },
        { message: "must have required property 'baseURL'" },
        { message: "must have required property 'version'" },
      ],
    });

    // Validation should continue even with errors
    await validateCommand(schemaPath);

    expect(mockValidateFile).toHaveBeenCalledWith(schemaPath);
  });

  it('should handle empty directory', async () => {
    await validateCommand();

    // Should not call validateFile if no yaml files found
    expect(mockValidateFile).not.toHaveBeenCalled();
  });

  it('should skip non-yaml files', async () => {
    await fs.writeFile(path.join(tempDir, 'readme.md'), '# README', 'utf-8');
    await fs.writeFile(path.join(tempDir, 'config.json'), '{}', 'utf-8');
    await fs.writeFile(
      path.join(tempDir, 'api.yaml'),
      yaml.dump({ id: 'api', name: 'API', version: '1.0.0', baseURL: 'https://api.com', endpoints: [] }),
      'utf-8'
    );

    mockValidateFile.mockReturnValue({ valid: true, errors: [] });

    await validateCommand();

    expect(mockValidateFile).toHaveBeenCalledTimes(1);
    expect(mockValidateFile).toHaveBeenCalledWith(path.join(tempDir, 'api.yaml'));
  });

  it('should handle file not found error', async () => {
    const nonExistentPath = path.join(tempDir, 'non-existent.yaml');
    
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(validateCommand(nonExistentPath)).rejects.toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);
    
    mockExit.mockRestore();
  });

  it('should handle invalid YAML files', async () => {
    const schemaPath = path.join(tempDir, 'invalid.yaml');
    await fs.writeFile(schemaPath, 'invalid: yaml: content:::', 'utf-8');

    mockValidateFile.mockImplementation(() => {
      throw new Error('Invalid YAML');
    });

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(validateCommand(schemaPath)).rejects.toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);
    
    mockExit.mockRestore();
  });

  it('should validate all files and report summary', async () => {
    const validSchema: APISchema = {
      id: 'valid-api',
      name: 'Valid API',
      version: '1.0.0',
      baseURL: 'https://valid.test.com',
      endpoints: [],
    };

    const invalidSchema = {
      id: 'invalid-api',
      // Missing required fields
      endpoints: [],
    };

    await fs.writeFile(
      path.join(tempDir, 'valid.yaml'),
      yaml.dump(validSchema),
      'utf-8'
    );
    await fs.writeFile(
      path.join(tempDir, 'invalid.yaml'),
      yaml.dump(invalidSchema),
      'utf-8'
    );

    mockValidateFile
      .mockReturnValueOnce({ valid: true, errors: [] })
      .mockReturnValueOnce({
        valid: false,
        errors: [{ message: "must have required property 'name'" }],
      });

    await validateCommand();

    expect(mockValidateFile).toHaveBeenCalledTimes(2);
  });

  it('should exit with error code when validation fails', async () => {
    const invalidSchema = {
      id: 'api',
      // Missing other required fields
    };

    const schemaPath = path.join(tempDir, 'invalid.yaml');
    await fs.writeFile(schemaPath, yaml.dump(invalidSchema), 'utf-8');

    mockValidateFile.mockReturnValue({
      valid: false,
      errors: [{ message: 'Missing required fields' }],
    });

    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });

    await expect(validateCommand()).rejects.toThrow('process.exit called');
    expect(mockExit).toHaveBeenCalledWith(1);
    
    mockExit.mockRestore();
  });
});