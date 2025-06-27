import fetch, { RequestInit } from 'node-fetch';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import { HttpRequest, HttpResponse, ApiTestResult, RawHttpOptions } from '../types/http';
import { logger, logApiRequest } from '../utils/logger';

export class ApiTester {
  private defaultTimeout = 30000; // 30 seconds

  async executeRequest(
    request: HttpRequest,
    options: RawHttpOptions = {}
  ): Promise<ApiTestResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();

    try {
      let response: HttpResponse;

      if (options.rawMode) {
        response = await this.executeRawRequest(request);
      } else {
        response = await this.executeFetchRequest(request, options);
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
        error: error instanceof Error ? error.message : String(error),
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
      fetchOptions.body = typeof request.body === 'string' 
        ? request.body 
        : JSON.stringify(request.body);
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

      const req = lib.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
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

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const bodyData = typeof request.body === 'string' 
          ? request.body 
          : JSON.stringify(request.body);
        req.write(bodyData);
      }

      req.end();
    });
  }
}