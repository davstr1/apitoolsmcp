import { logger } from './logger';
import { NetworkError } from '../errors';

export interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  retryCondition?: (error: Error) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 30000,
  retryCondition: (error: Error) => {
    // Retry on network errors and specific HTTP status codes
    if (error instanceof NetworkError) {
      return true;
    }
    // Check for retryable HTTP status codes
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    const statusCode = (error as any).statusCode;
    return statusCode && retryableStatusCodes.includes(statusCode);
  },
};

export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | undefined;
  let delay = opts.delayMs;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      logger.debug(`Attempt ${attempt}/${opts.maxAttempts}`, {
        operation: operation.name || 'anonymous',
      });

      const result = await operation();

      if (attempt > 1) {
        logger.info(`Operation succeeded after ${attempt} attempts`);
      }

      return result;
    } catch (error) {
      lastError = error as Error;

      if (attempt === opts.maxAttempts || !opts.retryCondition(lastError)) {
        logger.error(`Operation failed after ${attempt} attempts`, {
          error: lastError.message,
          finalAttempt: attempt === opts.maxAttempts,
        });
        throw lastError;
      }

      logger.warn(`Operation failed, retrying in ${delay}ms`, {
        attempt,
        error: lastError.message,
        nextDelay: delay,
      });

      await sleep(delay);

      // Exponential backoff
      delay = Math.min(delay * opts.backoffMultiplier, opts.maxDelayMs);
    }
  }

  throw lastError || new Error('Retry failed');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
