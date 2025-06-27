import { BaseError, ErrorCode } from './base-error';

export class FileNotFoundError extends BaseError {
  constructor(filePath: string) {
    super(`File not found: ${filePath}`, ErrorCode.FILE_NOT_FOUND, 404, true, {
      filePath,
    });
  }
}

export class PermissionDeniedError extends BaseError {
  constructor(filePath: string, operation: 'read' | 'write' | 'delete') {
    super(
      `Permission denied: Cannot ${operation} file ${filePath}`,
      ErrorCode.PERMISSION_DENIED,
      403,
      true,
      {
        filePath,
        operation,
      }
    );
  }
}

export class FileReadError extends BaseError {
  constructor(filePath: string, cause?: Error) {
    super(`Failed to read file: ${filePath}`, ErrorCode.FILE_READ_ERROR, 500, true, {
      filePath,
      cause: cause?.message,
    });
  }
}

export class FileWriteError extends BaseError {
  constructor(filePath: string, cause?: Error) {
    super(`Failed to write file: ${filePath}`, ErrorCode.FILE_WRITE_ERROR, 500, true, {
      filePath,
      cause: cause?.message,
    });
  }
}
