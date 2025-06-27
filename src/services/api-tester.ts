import fetch, { RequestInit } from 'node-fetch';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import { HttpRequest, HttpResponse, ApiTestResult, RawHttpOptions } from '../types/http';
import { logger } from '../utils/logger';
import {
  NetworkError,
  RequestTimeoutError,
  ConnectionRefusedError,
  DnsLookupError,
} from '../errors';
import { Validator, ValidationSchema } from '../utils/validators';
import { retry } from '../utils/retry';
import { CircuitBreaker } from '../utils/circuit-breaker';

export class ApiTester {
  private defaultTimeout = 30000; // 30 seconds
  private defaultMaxRetries = 3;
  private defaultRetryDelay = 1000;
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();

  private requestSchema: ValidationSchema = {
    url: {
      required: true,
      ...Validator.common.url,
    },
    method: {
      required: true,
      ...Validator.common.httpMethod,
    },
  };

  private getCircuitBreaker(url: string): CircuitBreaker {
    const host = new URL(url).host;
    
    if (!this.circuitBreakers.has(host)) {
      this.circuitBreakers.set(host, new CircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minute
        volumeThreshold: 10,
        errorThresholdPercentage: 50,
      }));
    }
    
    return this.circuitBreakers.get(host)!;
  }

  async executeRequest(request: HttpRequest, options: RawHttpOptions = {}): Promise<ApiTestResult> {
    // Validate request
    Validator.validate(request, this.requestSchema);

    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    const circuitBreaker = this.getCircuitBreaker(request.url);

    try {
      let response: HttpResponse;

      const executeWithRetry = async () => {
        if (options.rawMode) {
          return await retry(() => this.executeRawRequest(request), {
            maxAttempts: options.maxRetries || this.defaultMaxRetries,
            delayMs: this.defaultRetryDelay,
            backoffMultiplier: 2,
            retryCondition: (error: Error) => {
              // Retry on network errors and 5xx status codes
              if (error instanceof NetworkError || 
                  error instanceof RequestTimeoutError ||
                  error instanceof ConnectionRefusedError ||
                  error instanceof DnsLookupError) {
                return true;
              }
              const statusCode = (error as any).statusCode;
              return statusCode && statusCode >= 500 && statusCode < 600;
            }
          });
        } else {
          return await retry(() => this.executeFetchRequest(request, options), {
            maxAttempts: options.maxRetries || this.defaultMaxRetries,
            delayMs: this.defaultRetryDelay,
            backoffMultiplier: 2,
            retryCondition: (error: Error) => {
              // Retry on network errors and 5xx status codes
              if (error instanceof NetworkError || 
                  error instanceof RequestTimeoutError ||
                  error instanceof ConnectionRefusedError ||
                  error instanceof DnsLookupError) {
                return true;
              }
              const statusCode = (error as any).statusCode;
              return statusCode && statusCode >= 500 && statusCode < 600;
            }
          });
        }
      };

      // Execute with circuit breaker if not disabled
      if (options.disableCircuitBreaker) {
        response = await executeWithRetry();
      } else {
        response = await circuitBreaker.execute(executeWithRetry);
      }

      const responseTime = Date.now() - startTime;
      response.responseTime = responseTime;

      return {
        request,
        response,
        timestamp,
        success: true,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Transform error to our custom error types
      let customError: Error;
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          customError = new RequestTimeoutError(
            request.url,
            request.timeout || this.defaultTimeout
          );
        } else if (error.message.includes('ECONNREFUSED')) {
          customError = new ConnectionRefusedError(request.url, error);
        } else if (error.message.includes('ENOTFOUND') || error.message.includes('getaddrinfo')) {
          const url = new URL(request.url);
          customError = new DnsLookupError(url.hostname, error);
        } else {
          customError = new NetworkError(`Request failed: ${error.message}`, error);
        }
      } else {
        customError = new NetworkError(`Request failed: ${String(error)}`);
      }

      logger.error('Request failed', {
        url: request.url,
        method: request.method,
        error: customError.message,
        responseTime,
      });

      return {
        request,
        response: {
          status: 0,
          statusText: 'Network Error',
          headers: {},
          body: null,
          responseTime,
        },
        timestamp,
        success: false,
        error: customError.message,
      };
    }
  }

  private async executeFetchRequest(
    request: HttpRequest,
    options: RawHttpOptions
  ): Promise<HttpResponse> {
    const url = new URL(request.url);

    // Apply query parameters
    if (request.params) {
      Object.entries(request.params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const fetchOptions: RequestInit = {
      method: request.method,
      headers: request.headers,
      timeout: request.timeout || this.defaultTimeout,
      redirect: options.followRedirects === false ? 'manual' : 'follow',
    };

    if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      fetchOptions.body =
        typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
    }

    logger.debug('Request details', {
      url: url.toString(),
      method: request.method,
      headers: request.headers,
      ...(request.body && { body: request.body }),
    });

    const response = await fetch(url.toString(), fetchOptions);

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let body: any;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      body = await response.json();
    } else if (contentType.includes('text/')) {
      body = await response.text();
    } else {
      body = await response.buffer();
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      body,
      responseTime: 0, // Will be set by caller
    };
  }

  private async executeRawRequest(request: HttpRequest): Promise<HttpResponse> {
    return new Promise((resolve, reject) => {
      const url = new URL(request.url);
      const isHttps = url.protocol === 'https:';
      const lib = isHttps ? https : http;

      // Apply query parameters
      if (request.params) {
        Object.entries(request.params).forEach(([key, value]) => {
          url.searchParams.set(key, value);
        });
      }

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: request.method,
        headers: request.headers,
        timeout: request.timeout || this.defaultTimeout,
      };

      logger.debug('Raw request details', {
        protocol: url.protocol,
        host: `${options.hostname}:${options.port}`,
        path: options.path,
        method: options.method,
        headers: options.headers,
      });

      const req = lib.request(options, res => {
        let data = '';

        res.on('data', chunk => {
          data += chunk;
        });

        res.on('end', () => {
          const responseHeaders: Record<string, string> = {};
          Object.entries(res.headers).forEach(([key, value]) => {
            if (value !== undefined) {
              responseHeaders[key] = Array.isArray(value) ? value.join(', ') : value;
            }
          });

          let body: any = data;
          const contentType = res.headers['content-type'] || '';

          if (contentType.includes('application/json')) {
            try {
              body = JSON.parse(data);
            } catch {
              // Keep as string if JSON parsing fails
            }
          }

          resolve({
            status: res.statusCode || 0,
            statusText: res.statusMessage || '',
            headers: responseHeaders,
            body,
            responseTime: 0, // Will be set by caller
          });
        });
      });

      req.on('error', error => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const bodyData =
          typeof request.body === 'string' ? request.body : JSON.stringify(request.body);
        req.write(bodyData);
      }

      req.end();
    });
  }
}
