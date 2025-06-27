import { logger } from './logger';

export interface RateLimitOptions {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Maximum requests per window
  keyGenerator?: (req: any) => string;  // Function to generate key from request
  skipSuccessfulRequests?: boolean;  // Don't count successful requests
  skipFailedRequests?: boolean;  // Don't count failed requests
  message?: string;  // Error message when rate limited
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

// Token bucket implementation
export class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRate: number;  // tokens per millisecond

  constructor(capacity: number, refillPerSecond: number) {
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillPerSecond / 1000;
    this.lastRefill = Date.now();
  }

  consume(tokens: number = 1): boolean {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed * this.refillRate;
    
    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  getInfo(): { tokens: number; capacity: number } {
    this.refill();
    return {
      tokens: Math.floor(this.tokens),
      capacity: this.capacity,
    };
  }
}

// Sliding window rate limiter
export class SlidingWindowRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions) {
    this.options = {
      keyGenerator: (req) => req.ip || 'anonymous',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'Too many requests, please try again later',
      ...options,
    };
  }

  async checkLimit(key: string): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    
    // Get or create request timestamps for this key
    let timestamps = this.requests.get(key) || [];
    
    // Remove old timestamps outside the window
    timestamps = timestamps.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (timestamps.length >= this.options.maxRequests) {
      const oldestTimestamp = timestamps[0];
      const resetTime = new Date(oldestTimestamp + this.options.windowMs);
      const retryAfter = Math.ceil((resetTime.getTime() - now) / 1000);
      
      return {
        allowed: false,
        info: {
          limit: this.options.maxRequests,
          remaining: 0,
          reset: resetTime,
          retryAfter,
        },
      };
    }
    
    // Add current timestamp
    timestamps.push(now);
    this.requests.set(key, timestamps);
    
    // Clean up old keys periodically
    if (Math.random() < 0.01) {  // 1% chance
      this.cleanup();
    }
    
    return {
      allowed: true,
      info: {
        limit: this.options.maxRequests,
        remaining: this.options.maxRequests - timestamps.length,
        reset: new Date(now + this.options.windowMs),
      },
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    
    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter(t => t > windowStart);
      
      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimestamps);
      }
    }
  }
}

// Fixed window rate limiter
export class FixedWindowRateLimiter {
  private windows: Map<string, { count: number; reset: number }> = new Map();
  private options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions) {
    this.options = {
      keyGenerator: (req) => req.ip || 'anonymous',
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      message: 'Too many requests, please try again later',
      ...options,
    };
  }

  async checkLimit(key: string): Promise<{ allowed: boolean; info: RateLimitInfo }> {
    const now = Date.now();
    const currentWindow = Math.floor(now / this.options.windowMs);
    
    let windowData = this.windows.get(key);
    
    // Create new window if doesn't exist or expired
    if (!windowData || windowData.reset < now) {
      windowData = {
        count: 0,
        reset: (currentWindow + 1) * this.options.windowMs,
      };
      this.windows.set(key, windowData);
    }
    
    // Check if limit exceeded
    if (windowData.count >= this.options.maxRequests) {
      const retryAfter = Math.ceil((windowData.reset - now) / 1000);
      
      return {
        allowed: false,
        info: {
          limit: this.options.maxRequests,
          remaining: 0,
          reset: new Date(windowData.reset),
          retryAfter,
        },
      };
    }
    
    // Increment counter
    windowData.count++;
    
    return {
      allowed: true,
      info: {
        limit: this.options.maxRequests,
        remaining: this.options.maxRequests - windowData.count,
        reset: new Date(windowData.reset),
      },
    };
  }
}

// Express middleware factory
export function createRateLimitMiddleware(limiter: SlidingWindowRateLimiter | FixedWindowRateLimiter) {
  return async (req: any, res: any, next: any) => {
    const key = req.ip || 'anonymous';
    const { allowed, info } = await limiter.checkLimit(key);
    
    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', info.limit);
    res.setHeader('X-RateLimit-Remaining', info.remaining);
    res.setHeader('X-RateLimit-Reset', info.reset.toISOString());
    
    if (!allowed) {
      res.setHeader('Retry-After', info.retryAfter);
      logger.warn(`Rate limit exceeded for ${key}`);
      
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: info.retryAfter,
      });
    }
    
    next();
  };
}

// Per-API rate limiter
export class ApiRateLimiter {
  private limiters: Map<string, TokenBucket> = new Map();
  private defaultCapacity: number;
  private defaultRefillRate: number;

  constructor(defaultCapacity: number = 100, defaultRefillRate: number = 10) {
    this.defaultCapacity = defaultCapacity;
    this.defaultRefillRate = defaultRefillRate;
  }

  configureApi(apiId: string, capacity: number, refillRate: number): void {
    this.limiters.set(apiId, new TokenBucket(capacity, refillRate));
  }

  async checkLimit(apiId: string): Promise<boolean> {
    let limiter = this.limiters.get(apiId);
    
    if (!limiter) {
      limiter = new TokenBucket(this.defaultCapacity, this.defaultRefillRate);
      this.limiters.set(apiId, limiter);
    }
    
    return limiter.consume();
  }

  getInfo(apiId: string): { tokens: number; capacity: number } | null {
    const limiter = this.limiters.get(apiId);
    return limiter ? limiter.getInfo() : null;
  }
}

// Global rate limiter instance
let globalRateLimiter: SlidingWindowRateLimiter | null = null;

export function getGlobalRateLimiter(options?: RateLimitOptions): SlidingWindowRateLimiter {
  if (!globalRateLimiter) {
    globalRateLimiter = new SlidingWindowRateLimiter(options || {
      windowMs: 60 * 1000,  // 1 minute
      maxRequests: 100,  // 100 requests per minute
    });
  }
  return globalRateLimiter;
}