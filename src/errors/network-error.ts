import { BaseError, ErrorCode } from './base-error';

export class NetworkError extends BaseError {
  constructor(message: string, cause?: Error, context?: Record<string, any>) {
    super(message, ErrorCode.NETWORK_ERROR, 503, true, {
      ...context,
      cause: cause?.message,
    });
  }
}

export class RequestTimeoutError extends BaseError {
  constructor(url: string, timeoutMs: number) {
    super(
      `Request to ${url} timed out after ${timeoutMs}ms`,
      ErrorCode.REQUEST_TIMEOUT,
      408,
      true,
      {
        url,
        timeoutMs,
      }
    );
  }
}

export class ConnectionRefusedError extends BaseError {
  constructor(url: string, cause?: Error) {
    super(`Connection refused to ${url}`, ErrorCode.CONNECTION_REFUSED, 503, true, {
      url,
      cause: cause?.message,
    });
  }
}

export class DnsLookupError extends BaseError {
  constructor(hostname: string, cause?: Error) {
    super(`DNS lookup failed for ${hostname}`, ErrorCode.DNS_LOOKUP_FAILED, 503, true, {
      hostname,
      cause: cause?.message,
    });
  }
}
