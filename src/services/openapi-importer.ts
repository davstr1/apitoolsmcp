import { OpenAPIV3, OpenAPIV2 } from 'openapi-types';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import { APISchema, APIEndpoint, HTTPMethod, APIParameter, APIHeader } from '../types/api-schema';

export class OpenAPIImporter {
  async importFromFile(filePath: string): Promise<APISchema> {
    const content = await fs.readFile(filePath, 'utf-8');
    const isJson = filePath.endsWith('.json');
    
    const spec = isJson ? JSON.parse(content) : yaml.load(content) as any;
    
    if (this.isOpenAPIV3(spec)) {
      return this.convertOpenAPIV3(spec as OpenAPIV3.Document, filePath);
    } else if (this.isOpenAPIV2(spec)) {
      return this.convertOpenAPIV2(spec as OpenAPIV2.Document, filePath);
    } else {
      throw new Error('Not a valid OpenAPI specification');
    }
  }

  private isOpenAPIV3(spec: any): spec is OpenAPIV3.Document {
    return spec.openapi && spec.openapi.startsWith('3.');
  }

  private isOpenAPIV2(spec: any): spec is OpenAPIV2.Document {
    return spec.swagger === '2.0';
  }

  private convertOpenAPIV3(spec: OpenAPIV3.Document, sourceFile: string): APISchema {
    const servers = spec.servers || [{ url: 'https://api.example.com' }];
    const baseURL = servers[0].url;
    
    const endpoints: APIEndpoint[] = [];
    
    for (const [pathStr, pathItem] of Object.entries(spec.paths || {})) {
      if (!pathItem) continue;
      
      for (const [method, operation] of Object.entries(pathItem)) {
        if (method === 'parameters' || method === '$ref') continue;
        if (!this.isOperation(operation)) continue;
        
        const endpoint = this.convertV3Operation(
          pathStr,
          method.toUpperCase() as HTTPMethod,
          operation as OpenAPIV3.OperationObject,
          pathItem.parameters
        );
        
        endpoints.push(endpoint);
      }
    }
    
    const schema: APISchema = {
      id: this.generateId(spec.info.title),
      name: spec.info.title,
      version: spec.info.version,
      description: spec.info.description,
      baseURL,
      endpoints,
      metadata: {
        source: 'openapi',
        sourceFile,
        importedAt: new Date().toISOString(),
      },
    };
    
    // Extract global authentication
    if (spec.components?.securitySchemes) {
      const auth = this.extractV3Authentication(spec.components.securitySchemes);
      if (auth) {
        schema.authentication = auth;
      }
    }
    
    return schema;
  }

  private convertOpenAPIV2(spec: OpenAPIV2.Document, sourceFile: string): APISchema {
    const baseURL = `${spec.schemes?.[0] || 'https'}://${spec.host || 'api.example.com'}${spec.basePath || ''}`;
    
    const endpoints: APIEndpoint[] = [];
    
    for (const [pathStr, pathItem] of Object.entries(spec.paths || {})) {
      if (!pathItem) continue;
      
      for (const [method, operation] of Object.entries(pathItem)) {
        if (method === 'parameters' || method === '$ref') continue;
        if (!this.isV2Operation(operation)) continue;
        
        const endpoint = this.convertV2Operation(
          pathStr,
          method.toUpperCase() as HTTPMethod,
          operation as OpenAPIV2.OperationObject,
          pathItem.parameters
        );
        
        endpoints.push(endpoint);
      }
    }
    
    const schema: APISchema = {
      id: this.generateId(spec.info.title),
      name: spec.info.title,
      version: spec.info.version,
      description: spec.info.description,
      baseURL,
      endpoints,
      metadata: {
        source: 'openapi',
        sourceFile,
        importedAt: new Date().toISOString(),
      },
    };
    
    // Extract global authentication
    if (spec.securityDefinitions) {
      const auth = this.extractV2Authentication(spec.securityDefinitions);
      if (auth) {
        schema.authentication = auth;
      }
    }
    
    return schema;
  }

  private convertV3Operation(
    path: string,
    method: HTTPMethod,
    operation: OpenAPIV3.OperationObject,
    pathParameters?: (OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject)[]
  ): APIEndpoint {
    const endpoint: APIEndpoint = {
      path,
      method,
      description: operation.summary || operation.description,
    };
    
    // Combine path and operation parameters
    const allParameters = [...(pathParameters || []), ...(operation.parameters || [])];
    
    const parameters: APIParameter[] = [];
    const headers: APIHeader[] = [];
    
    for (const param of allParameters) {
      if (this.isReference(param)) continue;
      
      const p = param as OpenAPIV3.ParameterObject;
      
      if (p.in === 'query' || p.in === 'path') {
        parameters.push({
          name: p.name,
          type: this.getV3Type(p.schema),
          required: p.required || false,
          description: p.description,
          example: this.getV3Example(p),
        });
      } else if (p.in === 'header') {
        headers.push({
          name: p.name,
          required: p.required || false,
          description: p.description,
          example: this.getV3Example(p),
        });
      }
    }
    
    if (parameters.length > 0) {
      endpoint.parameters = parameters;
    }
    
    if (headers.length > 0) {
      endpoint.headers = headers;
    }
    
    // Handle request body
    if (operation.requestBody && !this.isReference(operation.requestBody)) {
      const requestBody = operation.requestBody as OpenAPIV3.RequestBodyObject;
      const content = requestBody.content?.['application/json'];
      
      if (content) {
        endpoint.requestBody = {
          required: requestBody.required || false,
          contentType: 'application/json',
          schema: content.schema,
          example: content.example,
        };
      }
    }
    
    // Handle responses
    if (operation.responses) {
      endpoint.responses = {};
      
      for (const [status, response] of Object.entries(operation.responses)) {
        if (this.isReference(response)) continue;
        
        const resp = response as OpenAPIV3.ResponseObject;
        endpoint.responses[status] = {
          description: resp.description,
        };
        
        const content = resp.content?.['application/json'];
        if (content) {
          endpoint.responses[status].contentType = 'application/json';
          endpoint.responses[status].schema = content.schema;
          endpoint.responses[status].example = content.example;
        }
      }
    }
    
    return endpoint;
  }

  private convertV2Operation(
    path: string,
    method: HTTPMethod,
    operation: OpenAPIV2.OperationObject,
    pathParameters?: (OpenAPIV2.ReferenceObject | OpenAPIV2.Parameter)[]
  ): APIEndpoint {
    const endpoint: APIEndpoint = {
      path,
      method,
      description: operation.summary || operation.description,
    };
    
    // Combine path and operation parameters
    const allParameters = [...(pathParameters || []), ...(operation.parameters || [])];
    
    const parameters: APIParameter[] = [];
    const headers: APIHeader[] = [];
    
    for (const param of allParameters) {
      if (this.isReference(param)) continue;
      
      const p = param as OpenAPIV2.Parameter;
      
      if (p.in === 'query' || p.in === 'path') {
        parameters.push({
          name: p.name,
          type: p.type as any || 'string',
          required: p.required || false,
          description: p.description,
        });
      } else if (p.in === 'header') {
        headers.push({
          name: p.name,
          required: p.required || false,
          description: p.description,
        });
      } else if (p.in === 'body' && 'schema' in p) {
        endpoint.requestBody = {
          required: p.required || false,
          contentType: 'application/json',
          schema: p.schema,
        };
      }
    }
    
    if (parameters.length > 0) {
      endpoint.parameters = parameters;
    }
    
    if (headers.length > 0) {
      endpoint.headers = headers;
    }
    
    // Handle responses
    if (operation.responses) {
      endpoint.responses = {};
      
      for (const [status, response] of Object.entries(operation.responses)) {
        if (this.isReference(response)) continue;
        
        const resp = response as OpenAPIV2.Response;
        endpoint.responses[status] = {
          description: (resp as any).description || '',
        };
        
        if ((resp as any).schema) {
          endpoint.responses[status].contentType = 'application/json';
          endpoint.responses[status].schema = (resp as any).schema;
        }
      }
    }
    
    return endpoint;
  }

  private isOperation(obj: any): boolean {
    return obj && typeof obj === 'object' && !('$ref' in obj);
  }

  private isV2Operation(obj: any): boolean {
    return obj && typeof obj === 'object' && 'responses' in obj;
  }

  private isReference(obj: any): obj is OpenAPIV3.ReferenceObject {
    return obj && '$ref' in obj;
  }

  private getV3Type(schema: any): APIParameter['type'] {
    if (!schema) return 'string';
    if (this.isReference(schema)) return 'string';
    
    const s = schema as OpenAPIV3.SchemaObject;
    
    switch (s.type) {
      case 'integer':
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'array':
        return 'array';
      case 'object':
        return 'object';
      default:
        return 'string';
    }
  }

  private getV3Example(param: OpenAPIV3.ParameterObject): any {
    if (param.example !== undefined) return param.example;
    if (param.schema && !this.isReference(param.schema)) {
      const schema = param.schema as OpenAPIV3.SchemaObject;
      return schema.example;
    }
    return undefined;
  }

  private extractV3Authentication(securitySchemes: Record<string, OpenAPIV3.ReferenceObject | OpenAPIV3.SecuritySchemeObject>): APISchema['authentication'] | undefined {
    for (const [, scheme] of Object.entries(securitySchemes)) {
      if (this.isReference(scheme)) continue;
      
      const s = scheme as OpenAPIV3.SecuritySchemeObject;
      
      switch (s.type) {
        case 'http':
          if (s.scheme === 'bearer') {
            return { type: 'bearer' };
          } else if (s.scheme === 'basic') {
            return { type: 'basic' };
          }
          break;
        case 'apiKey':
          return {
            type: 'apiKey',
            details: {
              name: s.name,
              in: s.in,
            },
          };
        case 'oauth2':
          return { type: 'oauth2' };
      }
    }
    
    return undefined;
  }

  private extractV2Authentication(securityDefinitions: OpenAPIV2.SecurityDefinitionsObject): APISchema['authentication'] | undefined {
    for (const [, scheme] of Object.entries(securityDefinitions)) {
      switch ((scheme as any).type) {
        case 'basic':
          return { type: 'basic' };
        case 'apiKey':
          return {
            type: 'apiKey',
            details: {
              name: (scheme as any).name,
              in: (scheme as any).in,
            },
          };
        case 'oauth2':
          return { type: 'oauth2' };
      }
    }
    
    return undefined;
  }

  private generateId(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}