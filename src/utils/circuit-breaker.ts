import { logger } from './logger';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening circuit
  resetTimeout: number; // Time in ms before attempting to close circuit
  requestTimeout?: number; // Timeout for individual requests
  volumeThreshold?: number; // Minimum number of requests before considering failures
  errorThresholdPercentage?: number; // Percentage of failures to open circuit
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailureTime?: number;
  private totalRequests = 0;
  private resetTimer?: NodeJS.Timeout;

  constructor(private options: CircuitBreakerOptions) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        logger.info('Circuit breaker entering HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.totalRequests++;
    
    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      logger.info('Successful request in HALF_OPEN state', {
        successes: this.successes,
      });
      
      // If we've had enough successes, close the circuit
      if (this.successes >= Math.ceil(this.options.failureThreshold / 2)) {
        this.reset();
      }
    } else {
      this.failures = 0; // Reset failure count on success
    }
  }

  private onFailure(): void {
    this.totalRequests++;
    this.failures++;
    this.lastFailureTime = Date.now();

    logger.warn('Request failed in circuit breaker', {
      failures: this.failures,
      threshold: this.options.failureThreshold,
      state: this.state,
    });

    if (this.state === CircuitState.HALF_OPEN) {
      this.open();
    } else if (this.shouldOpen()) {
      this.open();
    }
  }

  private shouldOpen(): boolean {
    // Check volume threshold if specified
    if (this.options.volumeThreshold && this.totalRequests < this.options.volumeThreshold) {
      return false;
    }

    // Check failure threshold
    if (this.failures >= this.options.failureThreshold) {
      return true;
    }

    // Check error percentage if specified
    if (this.options.errorThresholdPercentage && this.totalRequests > 0) {
      const errorPercentage = (this.failures / this.totalRequests) * 100;
      return errorPercentage >= this.options.errorThresholdPercentage;
    }

    return false;
  }

  private shouldAttemptReset(): boolean {
    return (
      this.lastFailureTime !== undefined &&
      Date.now() - this.lastFailureTime >= this.options.resetTimeout
    );
  }

  private open(): void {
    this.state = CircuitState.OPEN;
    logger.error('Circuit breaker is now OPEN', {
      failures: this.failures,
      totalRequests: this.totalRequests,
    });

    // Set timer to attempt reset
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    
    this.resetTimer = setTimeout(() => {
      this.state = CircuitState.HALF_OPEN;
      this.successes = 0;
      logger.info('Circuit breaker attempting reset to HALF_OPEN');
    }, this.options.resetTimeout);
  }

  private reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
    this.totalRequests = 0;
    this.lastFailureTime = undefined;
    
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
      this.resetTimer = undefined;
    }
    
    logger.info('Circuit breaker is now CLOSED');
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats(): {
    state: CircuitState;
    failures: number;
    successes: number;
    totalRequests: number;
  } {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests: this.totalRequests,
    };
  }
}