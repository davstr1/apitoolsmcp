import { YAMLScanner } from '../../src/schemas/yaml-scanner';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

describe('YAMLScanner', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'yaml-scanner-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('should find YAML files in directory', async () => {
    const scanner = new YAMLScanner(tempDir);
    
    // Create test files
    await fs.writeFile(path.join(tempDir, 'api1.yaml'), `
id: api1
name: API 1
version: 1.0.0
baseURL: https://api1.com
endpoints: []
`);
    
    await fs.writeFile(path.join(tempDir, 'api2.yml'), `
id: api2
name: API 2
version: 2.0.0
baseURL: https://api2.com
endpoints: []
`);
    
    // Create non-YAML file (should be ignored)
    await fs.writeFile(path.join(tempDir, 'readme.txt'), 'Not a YAML file');
    
    const schemas = await scanner.scanDirectory();
    
    expect(schemas).toHaveLength(2);
    expect(schemas.map(s => s.id).sort()).toEqual(['api1', 'api2']);
  });

  test('should handle subdirectories', async () => {
    const scanner = new YAMLScanner(tempDir);
    
    // Create subdirectory
    const subDir = path.join(tempDir, 'sub');
    await fs.mkdir(subDir);
    
    await fs.writeFile(path.join(tempDir, 'root.yaml'), `
id: root-api
name: Root API
version: 1.0.0
baseURL: https://root.com
endpoints: []
`);
    
    await fs.writeFile(path.join(subDir, 'sub.yaml'), `
id: sub-api
name: Sub API
version: 1.0.0
baseURL: https://sub.com
endpoints: []
`);
    
    const schemas = await scanner.scanDirectory();
    
    expect(schemas).toHaveLength(2);
    expect(schemas.map(s => s.id).sort()).toEqual(['root-api', 'sub-api']);
  });

  test('should handle empty directory', async () => {
    const scanner = new YAMLScanner(tempDir);
    const schemas = await scanner.scanDirectory();
    
    expect(schemas).toHaveLength(0);
  });

  test('should continue on invalid files', async () => {
    const scanner = new YAMLScanner(tempDir);
    
    // Valid file
    await fs.writeFile(path.join(tempDir, 'valid.yaml'), `
id: valid-api
name: Valid API
version: 1.0.0
baseURL: https://valid.com
endpoints: []
`);
    
    // Invalid file
    await fs.writeFile(path.join(tempDir, 'invalid.yaml'), `
invalid: yaml: content:::
`);
    
    const schemas = await scanner.scanDirectory();
    
    expect(schemas).toHaveLength(1);
    expect(schemas[0].id).toBe('valid-api');
  });
});