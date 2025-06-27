import { Validator } from '../../src/schemas/validator';
import { APISchema, HTTPMethod } from '../../src/types/api-schema';

describe('Validator', () => {
  let validator: Validator;

  beforeEach(() => {
    validator = new Validator();
  });

  test('should validate correct schema', () => {
    const schema: APISchema = {
      id: 'test-api',
      name: 'Test API',
      version: '1.0.0',
      baseURL: 'https://api.test.com',
      endpoints: [
        {
          path: '/test',
          method: HTTPMethod.GET,
          description: 'Test endpoint',
        },
      ],
    };

    const result = validator.validate(schema);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toBeUndefined();
  });

  test('should reject schema without required fields', () => {
    const schema = {
      name: 'Test API',
      version: '1.0.0',
      endpoints: [],
    } as any;

    const result = validator.validate(schema);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors).toContain(' must have required property \'id\'');
    expect(result.errors).toContain(' must have required property \'baseURL\'');
  });

  test('should reject schema with invalid endpoint method', () => {
    const schema: any = {
      id: 'test-api',
      name: 'Test API',
      version: '1.0.0',
      baseURL: 'https://api.test.com',
      endpoints: [
        {
          path: '/test',
          method: 'INVALID',
        },
      ],
    };

    const result = validator.validate(schema);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
  });

  test('should validate schema with complete endpoint', () => {
    const schema: APISchema = {
      id: 'test-api',
      name: 'Test API',
      version: '1.0.0',
      baseURL: 'https://api.test.com',
      endpoints: [
        {
          path: '/users/{id}',
          method: HTTPMethod.GET,
          description: 'Get user by ID',
          parameters: [
            {
              name: 'id',
              type: 'string',
              required: true,
              description: 'User ID',
            },
          ],
          headers: [
            {
              name: 'Authorization',
              required: true,
              description: 'Bearer token',
            },
          ],
        },
      ],
    };

    const result = validator.validate(schema);
    
    expect(result.valid).toBe(true);
  });
});