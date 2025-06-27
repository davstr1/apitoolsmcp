import { BaseError, ErrorCode } from './base-error';

export class ValidationError extends BaseError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, true, context);
  }
}

export class InvalidInputError extends BaseError {
  constructor(field: string, value: any, expectedType?: string) {
    const message = expectedType
      ? `Invalid input for field '${field}': expected ${expectedType}, got ${typeof value}`
      : `Invalid input for field '${field}'`;

    super(message, ErrorCode.INVALID_INPUT, 400, true, {
      field,
      value,
      expectedType,
      actualType: typeof value,
    });
  }
}

export class MissingRequiredFieldError extends BaseError {
  constructor(field: string) {
    super(`Missing required field: ${field}`, ErrorCode.MISSING_REQUIRED_FIELD, 400, true, {
      field,
    });
  }
}

export class InvalidSchemaError extends BaseError {
  constructor(schemaPath: string, errors: string[]) {
    super(
      `Invalid schema at ${schemaPath}: ${errors.join(', ')}`,
      ErrorCode.INVALID_SCHEMA,
      400,
      true,
      {
        schemaPath,
        errors,
      }
    );
  }
}
