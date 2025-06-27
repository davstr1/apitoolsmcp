import { Parser } from '../../src/schemas/parser';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

describe('Parser', () => {
  let parser: Parser;
  let tempDir: string;

  beforeEach(async () => {
    parser = new Parser();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'api-tools-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('should parse valid YAML file', async () => {
    const yamlContent = `
id: test-api
name: Test API
version: 1.0.0
baseURL: https://api.test.com
endpoints:
  - path: /test
    method: GET
    description: Test endpoint
`;
    
    const testFile = path.join(tempDir, 'test.yaml');
    await fs.writeFile(testFile, yamlContent);

    const result = await parser.parseYAMLFile(testFile);
    
    expect(result).not.toBeNull();
    expect(result?.id).toBe('test-api');
    expect(result?.name).toBe('Test API');
    expect(result?.version).toBe('1.0.0');
    expect(result?.baseURL).toBe('https://api.test.com');
    expect(result?.endpoints).toHaveLength(1);
  });

  test('should handle invalid YAML', async () => {
    const invalidYaml = `
invalid: yaml: content:::
`;
    
    const testFile = path.join(tempDir, 'invalid.yaml');
    await fs.writeFile(testFile, invalidYaml);

    const result = await parser.parseYAMLFile(testFile);
    
    expect(result).toBeNull();
  });

  test('should use filename as ID if not provided', async () => {
    const yamlContent = `
name: Test API
version: 1.0.0
baseURL: https://api.test.com
endpoints: []
`;
    
    const testFile = path.join(tempDir, 'my-api.yaml');
    await fs.writeFile(testFile, yamlContent);

    const result = await parser.parseYAMLFile(testFile);
    
    expect(result).not.toBeNull();
    expect(result?.id).toBe('my-api');
  });

  test('should parse HTTP methods correctly', async () => {
    const yamlContent = `
id: test-api
name: Test API
version: 1.0.0
baseURL: https://api.test.com
endpoints:
  - path: /test1
    method: get
  - path: /test2
    method: POST
  - path: /test3
    method: invalid
`;
    
    const testFile = path.join(tempDir, 'test.yaml');
    await fs.writeFile(testFile, yamlContent);

    const result = await parser.parseYAMLFile(testFile);
    
    expect(result).not.toBeNull();
    expect(result?.endpoints[0].method).toBe('GET');
    expect(result?.endpoints[1].method).toBe('POST');
    expect(result?.endpoints[2].method).toBe('GET'); // Default
  });
});