import { retry } from '../../src/utils/retry';
import { NetworkError } from '../../src/errors';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('retry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should succeed on first attempt', async () => {
    const operation = jest.fn().mockResolvedValue('success');
    
    const result = await retry(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and eventually succeed', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new NetworkError('Network error'))
      .mockRejectedValueOnce(new NetworkError('Network error'))
      .mockResolvedValue('success');
    
    const result = await retry(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should throw after max attempts', async () => {
    const error = new NetworkError('Network error');
    const operation = jest.fn().mockRejectedValue(error);
    
    await expect(retry(operation, { maxAttempts: 2 })).rejects.toThrow(error);
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should not retry non-retryable errors', async () => {
    const error = new Error('Non-retryable error');
    const operation = jest.fn().mockRejectedValue(error);
    
    await expect(retry(operation)).rejects.toThrow(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should respect custom retry condition', async () => {
    const error = new Error('Custom error');
    const operation = jest.fn().mockRejectedValue(error);
    const retryCondition = jest.fn().mockReturnValue(true);
    
    await expect(retry(operation, { 
      maxAttempts: 2,
      retryCondition 
    })).rejects.toThrow(error);
    
    expect(operation).toHaveBeenCalledTimes(2);
    expect(retryCondition).toHaveBeenCalledWith(error);
  });

  it('should apply exponential backoff', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new NetworkError('Error 1'))
      .mockRejectedValueOnce(new NetworkError('Error 2'))
      .mockResolvedValue('success');
    
    const start = Date.now();
    const result = await retry(operation, {
      delayMs: 100,
      backoffMultiplier: 2,
    });
    const duration = Date.now() - start;
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
    // First retry after 100ms, second after 200ms = 300ms total minimum
    expect(duration).toBeGreaterThanOrEqual(300);
  });

  it('should respect max delay', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new NetworkError('Error 1'))
      .mockRejectedValueOnce(new NetworkError('Error 2'))
      .mockResolvedValue('success');
    
    const start = Date.now();
    const result = await retry(operation, {
      delayMs: 100,
      backoffMultiplier: 10,
      maxDelayMs: 150,
    });
    const duration = Date.now() - start;
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
    // First retry after 100ms, second capped at 150ms = 250ms total
    expect(duration).toBeGreaterThanOrEqual(250);
    expect(duration).toBeLessThan(300);
  });

  it('should retry on specific HTTP status codes', async () => {
    const error = new Error('HTTP Error') as any;
    error.statusCode = 503;
    
    const operation = jest.fn()
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');
    
    const result = await retry(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-retryable HTTP status codes', async () => {
    const error = new Error('HTTP Error') as any;
    error.statusCode = 400;
    
    const operation = jest.fn().mockRejectedValue(error);
    
    await expect(retry(operation)).rejects.toThrow(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});