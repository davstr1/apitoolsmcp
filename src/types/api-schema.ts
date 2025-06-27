export enum HTTPMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

export interface APIParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  description?: string;
  default?: any;
  enum?: any[];
  format?: string;
  example?: any;
}

export interface APIHeader {
  name: string;
  value?: string;
  required: boolean;
  description?: string;
  example?: string;
}

export interface APIEndpoint {
  path: string;
  method: HTTPMethod;
  description?: string;
  parameters?: APIParameter[];
  headers?: APIHeader[];
  requestBody?: {
    required: boolean;
    contentType: string;
    schema?: any;
    example?: any;
  };
  responses?: {
    [statusCode: string]: {
      description: string;
      contentType?: string;
      schema?: any;
      example?: any;
    };
  };
  authentication?: {
    type: 'bearer' | 'basic' | 'apiKey' | 'oauth2';
    details?: any;
  };
}

export interface APISchema {
  id: string;
  name: string;
  version: string;
  description?: string;
  baseURL: string;
  endpoints: APIEndpoint[];
  globalHeaders?: APIHeader[];
  authentication?: {
    type: 'bearer' | 'basic' | 'apiKey' | 'oauth2';
    details?: any;
  };
  metadata?: {
    source?: 'yaml' | 'openapi' | 'manual';
    sourceFile?: string;
    importedAt?: string;
    lastModified?: string;
  };
}