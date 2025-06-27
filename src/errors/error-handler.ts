import { logger } from '../utils/logger';
import { BaseError, isOperationalError, serializeError } from './index';

export interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    statusCode?: number;
    details?: any;
  };
}

export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  public handle(error: Error): ErrorResponse {
    // Log the error
    if (isOperationalError(error)) {
      logger.error('Operational error occurred', serializeError(error));
    } else {
      // Unexpected errors are more serious
      logger.error('Unexpected error occurred', serializeError(error));
    }

    // Prepare response
    if (error instanceof BaseError) {
      return {
        error: {
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
          details: error.context,
        },
      };
    }

    // Generic error response for non-operational errors
    return {
      error: {
        message: 'An unexpected error occurred',
        statusCode: 500,
      },
    };
  }

  public async handleAsync<T>(
    operation: () => Promise<T>,
    errorMessage: string = 'Operation failed'
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const errorResponse = this.handle(error as Error);
      throw new Error(`${errorMessage}: ${errorResponse.error.message}`);
    }
  }

  public handleSync<T>(operation: () => T, errorMessage: string = 'Operation failed'): T {
    try {
      return operation();
    } catch (error) {
      const errorResponse = this.handle(error as Error);
      throw new Error(`${errorMessage}: ${errorResponse.error.message}`);
    }
  }
}

export const errorHandler = ErrorHandler.getInstance();
