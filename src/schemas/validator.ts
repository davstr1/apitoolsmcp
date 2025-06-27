import Ajv from 'ajv';
import { APISchema } from '../types/api-schema';

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

export class Validator {
  private ajv: Ajv;
  private schemaValidator: any;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    this.schemaValidator = this.ajv.compile(this.getAPISchemaSchema());
  }

  validate(schema: APISchema): ValidationResult {
    const valid = this.schemaValidator(schema);
    
    if (!valid) {
      return {
        valid: false,
        errors: this.schemaValidator.errors?.map((err: any) => 
          `${err.instancePath} ${err.message}`
        ),
      };
    }

    return { valid: true };
  }

  private getAPISchemaSchema() {
    return {
      type: 'object',
      required: ['id', 'name', 'version', 'baseURL', 'endpoints'],
      properties: {
        id: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1 },
        version: { type: 'string' },
        description: { type: 'string' },
        baseURL: { type: 'string' },
        endpoints: {
          type: 'array',
          items: {
            type: 'object',
            required: ['path', 'method'],
            properties: {
              path: { type: 'string' },
              method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'] },
              description: { type: 'string' },
              parameters: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['name', 'type', 'required'],
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string', enum: ['string', 'number', 'boolean', 'array', 'object'] },
                    required: { type: 'boolean' },
                    description: { type: 'string' },
                  },
                },
              },
              headers: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['name', 'required'],
                  properties: {
                    name: { type: 'string' },
                    value: { type: 'string' },
                    required: { type: 'boolean' },
                    description: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    };
  }
}