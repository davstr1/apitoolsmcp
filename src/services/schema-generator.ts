import toJsonSchema from 'to-json-schema';
import { APISchema, APIEndpoint, HTTPMethod } from '../types/api-schema';
import { ParameterInfo } from '../types/http';
import { ApiTestResult } from '../types/http';
import { ResponseAnalysis } from './response-analyzer';

interface GenerateOptions {
  apiInfo: {
    id: string;
    name: string;
    description?: string;
  };
  baseUrl: string;
  path: string;
  method: string;
  headers: Record<string, string>;
  parameters: ParameterInfo[];
  testResult?: ApiTestResult;
  analysis?: ResponseAnalysis;
}

export class SchemaGenerator {
  async generate(options: GenerateOptions): Promise<APISchema> {
    const endpoint = this.createEndpoint(options);
    
    // Add response information if we have test results
    if (options.testResult && options.analysis) {
      endpoint.responses = this.generateResponses(options.testResult, options.analysis);
    }

    const schema: APISchema = {
      id: options.apiInfo.id,
      name: options.apiInfo.name,
      version: '1.0.0',
      description: options.apiInfo.description,
      baseURL: options.baseUrl,
      endpoints: [endpoint],
      metadata: {
        source: 'tested',
        importedAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
      },
    };

    // Add global headers if any
    const authHeaders = this.extractAuthHeaders(options.headers);
    if (authHeaders.length > 0) {
      schema.globalHeaders = authHeaders.map(([name, value]) => ({
        name,
        value: value.includes('Bearer') ? undefined : value,
        required: true,
        description: this.getHeaderDescription(name),
        example: value.includes('Bearer') ? value : undefined,
      }));
    }

    return schema;
  }

  async generateBasic(options: GenerateOptions): Promise<APISchema> {
    const endpoint = this.createEndpoint(options);
    
    // Add generic response
    endpoint.responses = {
      '200': {
        description: 'Successful response',
      },
      '400': {
        description: 'Bad request',
      },
      '401': {
        description: 'Unauthorized',
      },
      '500': {
        description: 'Internal server error',
      },
    };

    const schema: APISchema = {
      id: options.apiInfo.id,
      name: options.apiInfo.name,
      version: '1.0.0',
      description: options.apiInfo.description,
      baseURL: options.baseUrl,
      endpoints: [endpoint],
      metadata: {
        source: 'manual',
        importedAt: new Date().toISOString(),
      },
    };

    // Add global headers if any
    const authHeaders = this.extractAuthHeaders(options.headers);
    if (authHeaders.length > 0) {
      schema.globalHeaders = authHeaders.map(([name, value]) => ({
        name,
        value: value.includes('Bearer') ? undefined : value,
        required: true,
        description: this.getHeaderDescription(name),
        example: value.includes('Bearer') ? value : undefined,
      }));
    }

    return schema;
  }

  private createEndpoint(options: GenerateOptions): APIEndpoint {
    const endpoint: APIEndpoint = {
      path: options.path,
      method: options.method as HTTPMethod,
      description: `${options.method} ${options.path}`,
    };

    // Add parameters
    const queryParams = options.parameters.filter(p => p.location === 'query');
    const pathParams = options.parameters.filter(p => p.location === 'path');
    const headerParams = options.parameters.filter(p => p.location === 'header');
    const bodyParams = options.parameters.filter(p => p.location === 'body');

    if (queryParams.length > 0 || pathParams.length > 0) {
      endpoint.parameters = [...pathParams, ...queryParams].map(p => ({
        name: p.name,
        type: p.type,
        required: p.required,
        description: p.description,
        default: p.default,
        example: p.example,
      }));
    }

    // Add non-auth headers
    const nonAuthHeaders = Object.entries(options.headers)
      .filter(([name]) => !this.isAuthHeader(name))
      .map(([name, value]) => ({
        name,
        value,
        required: true,
      }));

    if (nonAuthHeaders.length > 0 || headerParams.length > 0) {
      endpoint.headers = [...nonAuthHeaders, ...headerParams.map(p => ({
        name: p.name,
        required: p.required,
        description: p.description,
        example: p.example,
      }))];
    }

    // Add request body for POST/PUT/PATCH
    if (bodyParams.length > 0 && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
      const bodySchema: any = {
        type: 'object',
        properties: {},
        required: [],
      };

      bodyParams.forEach(param => {
        bodySchema.properties[param.name] = {
          type: param.type,
          description: param.description,
          example: param.example,
        };
        if (param.required) {
          bodySchema.required.push(param.name);
        }
      });

      endpoint.requestBody = {
        required: bodySchema.required.length > 0,
        contentType: 'application/json',
        schema: bodySchema,
      };
    }

    return endpoint;
  }

  private generateResponses(testResult: ApiTestResult, analysis: ResponseAnalysis): APIEndpoint['responses'] {
    const responses: APIEndpoint['responses'] = {};

    // Add the actual response
    const status = testResult.response.status.toString();
    responses[status] = {
      description: this.getStatusDescription(testResult.response.status),
      contentType: analysis.contentType || 'application/json',
    };

    if (analysis.exampleData) {
      responses[status].example = analysis.exampleData;
      
      // Generate JSON schema if it's JSON
      if (analysis.dataType === 'json') {
        try {
          const schema = toJsonSchema(analysis.exampleData, {
            required: false,
            arrays: { mode: 'first' },
            objects: { additionalProperties: false },
          });
          responses[status].schema = schema;
        } catch (error) {
          console.warn('Failed to generate JSON schema:', error);
        }
      }
    }

    // Add common error responses if not present
    if (!responses['400']) {
      responses['400'] = { description: 'Bad request' };
    }
    if (!responses['401'] && this.hasAuthHeaders(testResult.request.headers)) {
      responses['401'] = { description: 'Unauthorized' };
    }
    if (!responses['500']) {
      responses['500'] = { description: 'Internal server error' };
    }

    return responses;
  }

  private extractAuthHeaders(headers: Record<string, string>): Array<[string, string]> {
    return Object.entries(headers).filter(([name]) => this.isAuthHeader(name));
  }

  private isAuthHeader(name: string): boolean {
    const authHeaders = ['authorization', 'x-api-key', 'api-key', 'x-auth-token'];
    return authHeaders.includes(name.toLowerCase());
  }

  private hasAuthHeaders(headers: Record<string, string>): boolean {
    return Object.keys(headers).some(name => this.isAuthHeader(name));
  }

  private getHeaderDescription(name: string): string {
    const descriptions: Record<string, string> = {
      'authorization': 'Authorization header',
      'x-api-key': 'API key for authentication',
      'api-key': 'API key for authentication',
      'x-auth-token': 'Authentication token',
      'content-type': 'Request content type',
      'accept': 'Accepted response types',
    };
    return descriptions[name.toLowerCase()] || `${name} header`;
  }

  private getStatusDescription(status: number): string {
    const descriptions: Record<number, string> = {
      200: 'Successful response',
      201: 'Created successfully',
      204: 'No content',
      400: 'Bad request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not found',
      500: 'Internal server error',
      502: 'Bad gateway',
      503: 'Service unavailable',
    };
    return descriptions[status] || `HTTP ${status}`;
  }
}