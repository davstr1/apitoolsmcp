import * as fs from 'fs/promises';
import * as path from 'path';
import { getConfig, loadConfig } from '../../src/config/loader';
import { Config } from '../../src/types/config';

describe('Integration: Configuration Loading', () => {
  const testDir = path.join(__dirname, 'test-config');
  
  beforeEach(async () => {
    await fs.mkdir(testDir, { recursive: true });
  });
  
  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });
  
  it('should load configuration from JSON file', async () => {
    const configPath = path.join(testDir, 'config.json');
    const config: Config = {
      schemaDirectory: path.join(testDir, 'schemas'),
      remoteImports: {
        enabled: true,
        cacheDuration: 3600,
        timeout: 30000,
      },
      watchMode: false,
      validation: {
        strict: true,
        warnOnUnknownFields: true,
      },
      http: {
        defaultTimeout: 60000,
        maxRetries: 5,
        retryDelay: 2000,
      },
    };
    
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    const loaded = await loadConfig(configPath);
    
    expect(loaded).toEqual(config);
    expect(getConfig()).toEqual(config);
  });
  
  it('should load configuration from YAML file', async () => {
    const configPath = path.join(testDir, 'config.yaml');
    const yamlContent = `
schemaDirectory: ${path.join(testDir, 'schemas')}
remoteImports:
  enabled: true
  cacheDuration: 7200
  timeout: 45000
watchMode: true
validation:
  strict: false
  warnOnUnknownFields: false
http:
  defaultTimeout: 30000
  maxRetries: 3
`;
    
    await fs.writeFile(configPath, yamlContent);
    
    const loaded = await loadConfig(configPath);
    
    expect(loaded.schemaDirectory).toBe(path.join(testDir, 'schemas'));
    expect(loaded.remoteImports?.enabled).toBe(true);
    expect(loaded.remoteImports?.cacheDuration).toBe(7200);
    expect(loaded.watchMode).toBe(true);
    expect(loaded.validation?.strict).toBe(false);
    expect(loaded.http?.defaultTimeout).toBe(30000);
  });
  
  it('should merge environment variables with file config', async () => {
    const configPath = path.join(testDir, 'config.json');
    const config: Config = {
      schemaDirectory: path.join(testDir, 'schemas'),
      validation: {
        strict: true,
      },
    };
    
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    // Set environment variables
    process.env.API_TOOLS_SCHEMA_DIR = path.join(testDir, 'env-schemas');
    process.env.API_TOOLS_WATCH_MODE = 'true';
    process.env.API_TOOLS_HTTP_TIMEOUT = '120000';
    
    const loaded = await loadConfig(configPath);
    
    // Environment variables should override file config
    expect(loaded.schemaDirectory).toBe(path.join(testDir, 'env-schemas'));
    expect(loaded.watchMode).toBe(true);
    expect(loaded.http?.defaultTimeout).toBe(120000);
    expect(loaded.validation?.strict).toBe(true); // From file
    
    // Clean up env vars
    delete process.env.API_TOOLS_SCHEMA_DIR;
    delete process.env.API_TOOLS_WATCH_MODE;
    delete process.env.API_TOOLS_HTTP_TIMEOUT;
  });
  
  it('should handle missing config file gracefully', async () => {
    const configPath = path.join(testDir, 'non-existent.json');
    
    await expect(loadConfig(configPath)).rejects.toThrow();
  });
  
  it('should validate configuration schema', async () => {
    const configPath = path.join(testDir, 'invalid-config.json');
    const invalidConfig = {
      // Missing required schemaDirectory
      validation: {
        strict: 'yes', // Should be boolean
      },
    };
    
    await fs.writeFile(configPath, JSON.stringify(invalidConfig, null, 2));
    
    await expect(loadConfig(configPath)).rejects.toThrow();
  });
  
  it('should handle relative schema directory paths', async () => {
    const configPath = path.join(testDir, 'config.json');
    const config: Config = {
      schemaDirectory: './schemas', // Relative path
      validation: {
        strict: true,
      },
    };
    
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    const loaded = await loadConfig(configPath);
    
    // Should resolve to absolute path
    expect(path.isAbsolute(loaded.schemaDirectory)).toBe(true);
    expect(loaded.schemaDirectory).toBe(path.join(testDir, 'schemas'));
  });
  
  it('should create schema directory if it does not exist', async () => {
    const configPath = path.join(testDir, 'config.json');
    const schemaDir = path.join(testDir, 'new-schemas');
    const config: Config = {
      schemaDirectory: schemaDir,
      validation: {
        strict: true,
      },
    };
    
    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
    
    // Schema directory should not exist yet
    await expect(fs.access(schemaDir)).rejects.toThrow();
    
    await loadConfig(configPath);
    
    // Schema directory should be created
    const stats = await fs.stat(schemaDir);
    expect(stats.isDirectory()).toBe(true);
  });
});