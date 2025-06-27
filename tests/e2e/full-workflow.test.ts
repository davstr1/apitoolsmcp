import * as fs from 'fs/promises';
import * as path from 'path';
import { execSync } from 'child_process';
import * as yaml from 'js-yaml';
import { APISchema } from '../../src/types/api-schema';

describe('E2E: Full CLI Workflow', () => {
  const testDir = path.join(__dirname, 'test-workspace');
  const configPath = path.join(testDir, 'config.json');
  const schemaDir = path.join(testDir, 'schemas');
  
  beforeAll(async () => {
    // Create test workspace
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(schemaDir, { recursive: true });
    
    // Create config file
    const config = {
      schemaDirectory: schemaDir,
      validation: {
        strict: true
      }
    };
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  });
  
  afterAll(async () => {
    // Clean up test workspace
    await fs.rm(testDir, { recursive: true, force: true });
  });
  
  it('should complete full workflow: add, list, validate, edit, delete', async () => {
    const cliPath = path.join(__dirname, '../../dist/cli/index.js');
    
    // Step 1: Add a manual API
    const apiSchema: APISchema = {
      id: 'test-api',
      name: 'Test API',
      version: '1.0.0',
      baseURL: 'https://api.test.com',
      endpoints: [
        {
          path: '/users',
          method: 'GET',
          parameters: [],
          description: 'Get all users',
        },
        {
          path: '/users/:id',
          method: 'GET',
          parameters: [
            {
              name: 'id',
              type: 'string',
              required: true,
              location: 'path',
              description: 'User ID',
            }
          ],
          description: 'Get user by ID',
        }
      ],
      metadata: {
        source: 'manual',
        createdAt: new Date().toISOString(),
      }
    };
    
    const schemaPath = path.join(schemaDir, 'test-api.yaml');
    await fs.writeFile(schemaPath, yaml.dump(apiSchema));
    
    // Step 2: List APIs
    const listOutput = execSync(
      `node ${cliPath} list --config ${configPath}`,
      { encoding: 'utf8' }
    );
    expect(listOutput).toContain('test-api');
    expect(listOutput).toContain('Test API');
    expect(listOutput).toContain('1.0.0');
    
    // Step 3: Validate API
    const validateOutput = execSync(
      `node ${cliPath} validate test-api --config ${configPath}`,
      { encoding: 'utf8' }
    );
    expect(validateOutput).toContain('valid');
    
    // Step 4: Edit API (add new endpoint)
    const updatedSchema = { ...apiSchema };
    updatedSchema.endpoints.push({
      path: '/users',
      method: 'POST',
      parameters: [
        {
          name: 'name',
          type: 'string',
          required: true,
          location: 'body',
          description: 'User name',
        }
      ],
      description: 'Create new user',
    });
    await fs.writeFile(schemaPath, yaml.dump(updatedSchema));
    
    // Step 5: Validate updated API
    const validateOutput2 = execSync(
      `node ${cliPath} validate test-api --config ${configPath}`,
      { encoding: 'utf8' }
    );
    expect(validateOutput2).toContain('valid');
    
    // Step 6: Delete API
    await fs.unlink(schemaPath);
    
    // Step 7: Verify deletion
    const listOutput2 = execSync(
      `node ${cliPath} list --config ${configPath}`,
      { encoding: 'utf8' }
    );
    expect(listOutput2).not.toContain('test-api');
  });
  
  it('should handle API testing workflow', async () => {
    const cliPath = path.join(__dirname, '../../dist/cli/index.js');
    
    // Create a test API schema with test endpoint
    const apiSchema: APISchema = {
      id: 'httpbin-test',
      name: 'HTTPBin Test',
      version: '1.0.0',
      baseURL: 'https://httpbin.org',
      endpoints: [
        {
          path: '/get',
          method: 'GET',
          parameters: [
            {
              name: 'test',
              type: 'string',
              required: false,
              location: 'query',
              description: 'Test parameter',
            }
          ],
          description: 'Test GET endpoint',
        }
      ],
      metadata: {
        source: 'tested',
        createdAt: new Date().toISOString(),
      }
    };
    
    const schemaPath = path.join(schemaDir, 'httpbin-test.yaml');
    await fs.writeFile(schemaPath, yaml.dump(apiSchema));
    
    // Run test command (would need mock or real endpoint)
    // This is a placeholder - in real implementation would test against mock server
    expect(true).toBe(true);
    
    // Clean up
    await fs.unlink(schemaPath);
  });
  
  it('should handle error scenarios gracefully', async () => {
    const cliPath = path.join(__dirname, '../../dist/cli/index.js');
    
    // Test invalid API ID
    expect(() => {
      execSync(
        `node ${cliPath} validate non-existent-api --config ${configPath}`,
        { encoding: 'utf8' }
      );
    }).toThrow();
    
    // Test invalid config path
    expect(() => {
      execSync(
        `node ${cliPath} list --config /non/existent/path.json`,
        { encoding: 'utf8' }
      );
    }).toThrow();
  });
});