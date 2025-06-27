import { getConfig } from '../../src/config/loader';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';

describe('Config Loader', () => {
  const originalEnv = process.env;
  const originalCwd = process.cwd();
  let tempDir: string;

  beforeEach(async () => {
    process.env = { ...originalEnv };
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'api-tools-config-test-'));
    process.chdir(tempDir);
  });

  afterEach(async () => {
    process.env = originalEnv;
    process.chdir(originalCwd);
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('should return default config when no config files exist', async () => {
    const config = await getConfig();
    
    expect(config.schemaDirectory).toBe('./api-schemas');
    expect(config.remoteImports?.enabled).toBe(true);
    expect(config.validation?.strict).toBe(true);
  });

  test('should load config from environment variable', async () => {
    const customDir = '/custom/schemas';
    process.env.APITOOLSMCP_SCHEMA_DIR = customDir;
    
    const config = await getConfig();
    
    expect(config.schemaDirectory).toBe(customDir);
  });

  test('should load config from JSON file', async () => {
    const configFile = path.join(tempDir, '.apitoolsmcp.json');
    const customConfig = {
      schemaDirectory: './custom-schemas',
      validation: {
        strict: false,
      },
    };
    
    await fs.writeFile(configFile, JSON.stringify(customConfig));
    
    const config = await getConfig();
    
    expect(config.schemaDirectory).toBe('./custom-schemas');
    expect(config.validation?.strict).toBe(false);
    expect(config.remoteImports?.enabled).toBe(true); // Default preserved
  });

  test('should load config from YAML file', async () => {
    const configFile = path.join(tempDir, '.apitoolsmcp.yaml');
    const yamlConfig = `
schemaDirectory: ./yaml-schemas
server:
  port: 4000
`;
    
    await fs.writeFile(configFile, yamlConfig);
    
    const config = await getConfig();
    
    expect(config.schemaDirectory).toBe('./yaml-schemas');
    expect(config.server?.port).toBe(4000);
    expect(config.server?.host).toBe('localhost'); // Default preserved
  });

  test('should prioritize env var over config file', async () => {
    process.env.APITOOLSMCP_SCHEMA_DIR = '/env-schemas';
    
    const configFile = path.join(tempDir, '.apitoolsmcp.json');
    await fs.writeFile(configFile, JSON.stringify({
      schemaDirectory: './file-schemas',
    }));
    
    const config = await getConfig();
    
    expect(config.schemaDirectory).toBe('/env-schemas');
  });
});