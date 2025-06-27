import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Config } from '../types/config';
import { FileNotFoundError, FileReadError, InvalidConfigError } from '../errors';
import { logger } from '../utils/logger';

const DEFAULT_CONFIG: Config = {
  schemaDirectory: './api-schemas',
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
        logger.info(`Loaded configuration from ${configPath}`);
        break;
      } catch (error) {
        // Config file doesn't exist or is invalid, continue to next
        if (error instanceof InvalidConfigError) {
          logger.warn(`Invalid config file ${configPath}: ${error.message}`);
        }
      }
    }
  }

  // Check environment variables after loading config file
  if (process.env.APITOOLSMCP_SCHEMA_DIR) {
    config.schemaDirectory = path.resolve(process.env.APITOOLSMCP_SCHEMA_DIR);
  }

  return config;
}

async function loadConfigFile(filepath: string): Promise<Partial<Config>> {
  try {
    const content = await fs.readFile(filepath, 'utf-8');

    let parsedConfig: Partial<Config>;

    if (filepath.endsWith('.json')) {
      try {
        parsedConfig = JSON.parse(content);
      } catch (error) {
        throw new InvalidConfigError(filepath, [
          `Invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
        ]);
      }
    } else if (filepath.endsWith('.yaml') || filepath.endsWith('.yml')) {
      try {
        const yaml = await import('js-yaml');
        parsedConfig = yaml.load(content) as Partial<Config>;
      } catch (error) {
        throw new InvalidConfigError(filepath, [
          `Invalid YAML: ${error instanceof Error ? error.message : String(error)}`,
        ]);
      }
    } else {
      throw new InvalidConfigError(filepath, [
        `Unsupported file format. Use .json, .yaml, or .yml`,
      ]);
    }

    // Validate config structure
    validateConfigStructure(parsedConfig, filepath);

    return parsedConfig;
  } catch (error) {
    if (error instanceof InvalidConfigError) {
      throw error;
    }

    if ((error as any).code === 'ENOENT') {
      throw new FileNotFoundError(filepath);
    }

    throw new FileReadError(filepath, error as Error);
  }
}

function validateConfigStructure(config: Partial<Config>, filepath: string): void {
  const errors: string[] = [];

  if (config.schemaDirectory !== undefined && typeof config.schemaDirectory !== 'string') {
    errors.push('schemaDirectory must be a string');
  }

  if (config.remoteImports !== undefined) {
    if (typeof config.remoteImports !== 'object') {
      errors.push('remoteImports must be an object');
    } else {
      if (
        config.remoteImports.enabled !== undefined &&
        typeof config.remoteImports.enabled !== 'boolean'
      ) {
        errors.push('remoteImports.enabled must be a boolean');
      }
      if (
        config.remoteImports.cacheDuration !== undefined &&
        typeof config.remoteImports.cacheDuration !== 'number'
      ) {
        errors.push('remoteImports.cacheDuration must be a number');
      }
      if (
        config.remoteImports.timeout !== undefined &&
        typeof config.remoteImports.timeout !== 'number'
      ) {
        errors.push('remoteImports.timeout must be a number');
      }
    }
  }

  if (config.server !== undefined) {
    if (typeof config.server !== 'object') {
      errors.push('server must be an object');
    } else {
      if (config.server.host !== undefined && typeof config.server.host !== 'string') {
        errors.push('server.host must be a string');
      }
      if (config.server.port !== undefined && typeof config.server.port !== 'number') {
        errors.push('server.port must be a number');
      }
    }
  }

  if (errors.length > 0) {
    throw new InvalidConfigError(filepath, errors);
  }
}

function mergeConfigs(base: Config, override: Partial<Config>): Config {
  return {
    ...base,
    ...override,
    remoteImports: override.remoteImports
      ? {
          ...base.remoteImports,
          ...override.remoteImports,
        }
      : base.remoteImports,
    server: override.server
      ? {
          ...base.server,
          ...override.server,
        }
      : base.server,
    validation: override.validation
      ? {
          ...base.validation,
          ...override.validation,
        }
      : base.validation,
  };
}
