export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

export interface HttpRequest {
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  params?: Record<string, string>;
  body?: any;
  timeout?: number;
}

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: any;
  responseTime: number;
}

export interface ApiTestResult {
  request: HttpRequest;
  response: HttpResponse;
  timestamp: string;
  success: boolean;
  error?: string;
}

export interface RawHttpOptions {
  disableDefaultHeaders?: boolean;
  followRedirects?: boolean;
  validateStatus?: (status: number) => boolean;
  rawMode?: boolean; // Use native http/https modules
  maxRetries?: number; // Number of retry attempts for failed requests
  disableCircuitBreaker?: boolean; // Disable circuit breaker for this request
}

export interface ParameterInfo {
  name: string;
  value?: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
  example?: any;
  default?: any;
  location: 'query' | 'header' | 'path' | 'body';
}