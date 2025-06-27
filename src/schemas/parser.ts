import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { APISchema, APIEndpoint, HTTPMethod } from '../types/api-schema';
import { Validator } from './validator';

export class Parser {
  private validator: Validator;

  constructor() {
    this.validator = new Validator();
  }

  async parseYAMLFile(filePath: string): Promise<APISchema | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = yaml.load(content) as any;
      
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid YAML structure');
      }

      const schema = this.convertToAPISchema(data, filePath);
      
      const validation = this.validator.validate(schema);
      if (!validation.valid) {
        console.error(`Validation errors in ${filePath}:`, validation.errors);
        return null;
      }

      return schema;
    } catch (error) {
      console.error(`Error parsing ${filePath}:`, error);
      return null;
    }
  }

  private convertToAPISchema(data: any, filePath: string): APISchema {
    const schema: APISchema = {
      id: data.id || path.basename(filePath, path.extname(filePath)),
      name: data.name || 'Unnamed API',
      version: data.version || '1.0.0',
      description: data.description,
      baseURL: data.baseURL || data.baseUrl || '',
      endpoints: this.parseEndpoints(data.endpoints || []),
      globalHeaders: data.globalHeaders,
      authentication: data.authentication,
      metadata: {
        source: 'yaml',
        sourceFile: filePath,
        importedAt: new Date().toISOString(),
      },
    };

    return schema;
  }

  private parseEndpoints(endpoints: any[]): APIEndpoint[] {
    if (!Array.isArray(endpoints)) {
      return [];
    }

    return endpoints.map(ep => ({
      path: ep.path || '',
      method: this.parseHTTPMethod(ep.method),
      description: ep.description,
      parameters: ep.parameters,
      headers: ep.headers,
      requestBody: ep.requestBody,
      responses: ep.responses,
      authentication: ep.authentication,
    }));
  }

  private parseHTTPMethod(method: string): HTTPMethod {
    const upperMethod = (method || 'GET').toUpperCase();
    return HTTPMethod[upperMethod as keyof typeof HTTPMethod] || HTTPMethod.GET;
  }
}