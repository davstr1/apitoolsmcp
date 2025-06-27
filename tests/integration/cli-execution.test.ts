import { execSync } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { APISchema } from '../../src/types/api-schema';

describe('Integration: CLI Command Execution', () => {
  const testDir = path.join(__dirname, 'cli-test-workspace');
  const configPath = path.join(testDir, 'config.json');
  const schemaDir = path.join(testDir, 'schemas');
  const cliPath = path.join(__dirname, '../../dist/cli/index.js');
  
  beforeAll(async () => {
    // Create test workspace
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(schemaDir, { recursive: true });
    
    // Create config file
    const config = {
      schemaDirectory: schemaDir,
      validation: {
        strict: true,
      },
    };
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    // Create sample API schemas
    const sampleSchemas: APISchema[] = [
      {
        id: 'users-api',
        name: 'Users API',
        version: '1.0.0',
        baseURL: 'https://api.example.com',
        endpoints: [
          {
            path: '/users',
            method: 'GET',
            parameters: [],
            description: 'List all users',
          },
        ],
        metadata: {
          source: 'manual',
          createdAt: new Date().toISOString(),
        },
      },
      {
        id: 'products-api',
        name: 'Products API',
        version: '2.0.0',
        baseURL: 'https://api.products.com',
        endpoints: [
          {
            path: '/products',
            method: 'GET',
            parameters: [
              {
                name: 'category',
                type: 'string',
                required: false,
                location: 'query',
              },
            ],
            description: 'List products',
          },
        ],
        metadata: {
          source: 'openapi',
          createdAt: new Date().toISOString(),
        },
      },
    ];
    
    for (const schema of sampleSchemas) {
      const schemaPath = path.join(schemaDir, `${schema.id}.yaml`);
      await fs.writeFile(schemaPath, yaml.dump(schema));
    }
  });
  
  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });
  
  it('should execute list command', () => {
    const output = execSync(
      `node ${cliPath} list --config ${configPath}`,
      { encoding: 'utf8' }
    );
    
    expect(output).toContain('users-api');
    expect(output).toContain('Users API');
    expect(output).toContain('products-api');
    expect(output).toContain('Products API');
  });
  
  it('should execute list command with search filter', () => {
    const output = execSync(
      `node ${cliPath} list --search users --config ${configPath}`,
      { encoding: 'utf8' }
    );
    
    expect(output).toContain('users-api');
    expect(output).not.toContain('products-api');
  });
  
  it('should execute validate command', () => {
    const output = execSync(
      `node ${cliPath} validate users-api --config ${configPath}`,
      { encoding: 'utf8' }
    );
    
    expect(output).toContain('valid');
    expect(output).toContain('users-api');
  });
  
  it('should handle validate command with invalid API', async () => {
    // Create invalid schema
    const invalidSchema = {
      id: 'invalid-api',
      // Missing required fields
      endpoints: [],
    };
    
    const schemaPath = path.join(schemaDir, 'invalid-api.yaml');
    await fs.writeFile(schemaPath, yaml.dump(invalidSchema));
    
    let error: any;
    try {
      execSync(
        `node ${cliPath} validate invalid-api --config ${configPath}`,
        { encoding: 'utf8' }
      );
    } catch (e) {
      error = e;
    }
    
    expect(error).toBeDefined();
    expect(error.stdout || error.stderr).toContain('invalid');
    
    // Clean up
    await fs.unlink(schemaPath);
  });
  
  it('should execute help command', () => {
    const output = execSync(
      `node ${cliPath} --help`,
      { encoding: 'utf8' }
    );
    
    expect(output).toContain('Usage:');
    expect(output).toContain('Commands:');
    expect(output).toContain('list');
    expect(output).toContain('add');
    expect(output).toContain('validate');
  });
  
  it('should execute version command', () => {
    const output = execSync(
      `node ${cliPath} --version`,
      { encoding: 'utf8' }
    );
    
    expect(output).toMatch(/\d+\.\d+\.\d+/);
  });
  
  it('should handle unknown commands gracefully', () => {
    let error: any;
    try {
      execSync(
        `node ${cliPath} unknown-command --config ${configPath}`,
        { encoding: 'utf8' }
      );
    } catch (e) {
      error = e;
    }
    
    expect(error).toBeDefined();
    expect(error.status).not.toBe(0);
  });
  
  it('should respect quiet flag', () => {
    const output = execSync(
      `node ${cliPath} list --quiet --config ${configPath}`,
      { encoding: 'utf8' }
    );
    
    // Should still contain data but less verbose
    expect(output).toContain('users-api');
    expect(output.length).toBeLessThan(200); // Assume quiet output is compact
  });
  
  it('should handle JSON output format', () => {
    const output = execSync(
      `node ${cliPath} list --format json --config ${configPath}`,
      { encoding: 'utf8' }
    );
    
    const parsed = JSON.parse(output);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.length).toBe(2);
    expect(parsed.find((api: any) => api.id === 'users-api')).toBeDefined();
  });
});