import { CircuitBreaker, CircuitState } from '../../src/utils/circuit-breaker';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('CircuitBreaker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should start in CLOSED state', () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000,
    });
    
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should execute operations successfully when CLOSED', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000,
    });
    
    const operation = jest.fn().mockResolvedValue('success');
    const result = await breaker.execute(operation);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalled();
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should open circuit after failure threshold', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 3,
      resetTimeout: 60000,
    });
    
    const operation = jest.fn().mockRejectedValue(new Error('fail'));
    
    // Fail 3 times
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(operation);
      } catch {}
    }
    
    expect(breaker.getState()).toBe(CircuitState.OPEN);
    
    // Next call should fail immediately
    await expect(breaker.execute(operation)).rejects.toThrow('Circuit breaker is OPEN');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should transition to HALF_OPEN after reset timeout', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeout: 5000,
    });
    
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');
    
    // Open the circuit
    for (let i = 0; i < 2; i++) {
      try {
        await breaker.execute(operation);
      } catch {}
    }
    
    expect(breaker.getState()).toBe(CircuitState.OPEN);
    
    // Fast-forward past reset timeout
    jest.advanceTimersByTime(5001);
    
    // Should now execute and transition to HALF_OPEN
    const result = await breaker.execute(operation);
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should close circuit after successful requests in HALF_OPEN', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 4,
      resetTimeout: 5000,
    });
    
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValue('success');
    
    // Open the circuit
    for (let i = 0; i < 4; i++) {
      try {
        await breaker.execute(operation);
      } catch {}
    }
    
    expect(breaker.getState()).toBe(CircuitState.OPEN);
    
    // Fast-forward to HALF_OPEN
    jest.advanceTimersByTime(5001);
    
    // Success in HALF_OPEN - need 2 successes to close
    await breaker.execute(operation);
    expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
    
    await breaker.execute(operation);
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should reopen circuit on failure in HALF_OPEN', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeout: 5000,
    });
    
    const operation = jest.fn()
      .mockRejectedValue(new Error('fail'));
    
    // Open the circuit
    for (let i = 0; i < 2; i++) {
      try {
        await breaker.execute(operation);
      } catch {}
    }
    
    expect(breaker.getState()).toBe(CircuitState.OPEN);
    
    // Fast-forward to HALF_OPEN
    jest.advanceTimersByTime(5001);
    
    // Fail in HALF_OPEN
    try {
      await breaker.execute(operation);
    } catch {}
    
    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should respect volume threshold', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      resetTimeout: 5000,
      volumeThreshold: 5,
    });
    
    const operation = jest.fn().mockRejectedValue(new Error('fail'));
    
    // Fail 3 times but under volume threshold
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(operation);
      } catch {}
    }
    
    // Should still be CLOSED due to volume threshold
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
  });

  it('should open based on error percentage', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 100,
      resetTimeout: 5000,
      errorThresholdPercentage: 50,
    });
    
    const operation = jest.fn()
      .mockResolvedValueOnce('success')
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success')
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'));
    
    // 1 success, 1 failure (50%)
    await breaker.execute(operation);
    try { await breaker.execute(operation); } catch {}
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
    
    // 2 success, 1 failure (33%)
    await breaker.execute(operation);
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
    
    // 2 success, 2 failures (50%)
    try { await breaker.execute(operation); } catch {}
    expect(breaker.getState()).toBe(CircuitState.CLOSED);
    
    // 2 success, 3 failures (60%)
    try { await breaker.execute(operation); } catch {}
    expect(breaker.getState()).toBe(CircuitState.OPEN);
  });

  it('should provide accurate stats', async () => {
    const breaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 5000,
    });
    
    const operation = jest.fn()
      .mockResolvedValueOnce('success')
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce('success');
    
    await breaker.execute(operation);
    try { await breaker.execute(operation); } catch {}
    await breaker.execute(operation);
    
    const stats = breaker.getStats();
    expect(stats).toEqual({
      state: CircuitState.CLOSED,
      failures: 0, // Reset after success
      successes: 0,
      totalRequests: 3,
    });
  });
});