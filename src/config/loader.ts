import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Config } from '../types/config';

const DEFAULT_CONFIG: Config = {
  schemaDirectory: path.join(process.cwd(), 'api-schemas'),
  remoteImports: {
    enabled: true,
    cacheDuration: 3600000, // 1 hour
    timeout: 30000, // 30 seconds
  },
  watchMode: false,
  server: {
    host: 'localhost',
    port: 3000,
  },
  validation: {
    strict: true,
    warnOnUnknownFields: true,
  },
};

export async function getConfig(): Promise<Config> {
  let config = { ...DEFAULT_CONFIG };

  // Check environment variables
  if (process.env.APITOOLSMCP_SCHEMA_DIR) {
    config.schemaDirectory = path.resolve(process.env.APITOOLSMCP_SCHEMA_DIR);
  }

  if (process.env.APITOOLSMCP_CONFIG_PATH) {
    const configPath = path.resolve(process.env.APITOOLSMCP_CONFIG_PATH);
    const userConfig = await loadConfigFile(configPath);
    config = mergeConfigs(config, userConfig);
  } else {
    // Look for config files in standard locations
    const configPaths = [
      path.join(process.cwd(), '.apitoolsmcp.json'),
      path.join(process.cwd(), '.apitoolsmcp.yaml'),
      path.join(os.homedir(), '.apitoolsmcp.json'),
      path.join(os.homedir(), '.apitoolsmcp.yaml'),
    ];

    for (const configPath of configPaths) {
      try {
        const userConfig = await loadConfigFile(configPath);
        config = mergeConfigs(config, userConfig);
        break;
      } catch (error) {
        // Config file doesn't exist, continue to next
      }
    }
  }

  return config;
}

async function loadConfigFile(filepath: string): Promise<Partial<Config>> {
  try {
    const content = await fs.readFile(filepath, 'utf-8');
    
    if (filepath.endsWith('.json')) {
      return JSON.parse(content);
    } else if (filepath.endsWith('.yaml') || filepath.endsWith('.yml')) {
      const yaml = await import('js-yaml');
      return yaml.load(content) as Partial<Config>;
    }
    
    throw new Error(`Unsupported config file format: ${filepath}`);
  } catch (error) {
    throw new Error(`Failed to load config from ${filepath}: ${error}`);
  }
}

function mergeConfigs(base: Config, override: Partial<Config>): Config {
  return {
    ...base,
    ...override,
    remoteImports: {
      ...base.remoteImports,
      ...override.remoteImports,
    },
    server: {
      ...base.server,
      ...override.server,
    },
    validation: {
      ...base.validation,
      ...override.validation,
    },
  };
}