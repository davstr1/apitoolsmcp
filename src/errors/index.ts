// Export all error types from a single entry point
export * from './base-error';
export * from './validation-error';
export * from './network-error';
export * from './configuration-error';
export * from './file-error';

import { BaseError } from './base-error';

// Error handler utility
export function isOperationalError(error: Error): boolean {
  if (error instanceof BaseError) {
    return error.isOperational;
  }
  return false;
}

// Error serializer for logging
export function serializeError(error: Error): Record<string, any> {
  if (error instanceof BaseError) {
    return error.toJSON();
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  };
}
