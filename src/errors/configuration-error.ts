import { BaseError, ErrorCode } from './base-error';

export class ConfigurationError extends BaseError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.CONFIGURATION_ERROR, 500, false, context);
  }
}

export class InvalidConfigError extends BaseError {
  constructor(configPath: string, errors: string[]) {
    super(
      `Invalid configuration at ${configPath}: ${errors.join(', ')}`,
      ErrorCode.INVALID_CONFIG,
      500,
      false,
      {
        configPath,
        errors,
      }
    );
  }
}

export class MissingConfigError extends BaseError {
  constructor(configPath: string) {
    super(`Configuration file not found: ${configPath}`, ErrorCode.MISSING_CONFIG, 500, false, {
      configPath,
    });
  }
}
