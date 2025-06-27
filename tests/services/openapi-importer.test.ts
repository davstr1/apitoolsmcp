import { OpenAPIImporter } from '../../src/services/openapi-importer';
import * as fs from 'fs/promises';
import * as path from 'path';
import { createTempDir, cleanupTempDir } from '../setup';
import { HTTPMethod } from '../../src/types/api-schema';

describe('OpenAPIImporter', () => {
  let importer: OpenAPIImporter;
  let tempDir: string;

  beforeEach(() => {
    importer = new OpenAPIImporter();
    tempDir = createTempDir();
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('importFromFile', () => {
    describe('OpenAPI v3', () => {
      it('should import basic OpenAPI v3 spec', async () => {
        const spec = {
          openapi: '3.0.0',
          info: {
            title: 'Test API',
            version: '1.0.0',
            description: 'Test API description',
          },
          servers: [
            { url: 'https://api.test.com' },
            { url: 'https://api-staging.test.com' },
          ],
          paths: {
            '/users': {
              get: {
                summary: 'List users',
                operationId: 'listUsers',
                parameters: [
                  {
                    name: 'page',
                    in: 'query',
                    description: 'Page number',
                    required: false,
                    schema: { type: 'integer', default: 1 },
                  },
                ],
                responses: {
                  '200': {
                    description: 'Successful response',
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          properties: {
                            users: { type: 'array' },
                            total: { type: 'integer' },
                          },
                        },
                        example: { users: [], total: 0 },
                      },
                    },
                  },
                  '401': { description: 'Unauthorized' },
                },
              },
              post: {
                summary: 'Create user',
                requestBody: {
                  required: true,
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        required: ['name', 'email'],
                        properties: {
                          name: { type: 'string' },
                          email: { type: 'string', format: 'email' },
                        },
                      },
                    },
                  },
                },
                responses: {
                  '201': { description: 'Created' },
                },
              },
            },
            '/users/{id}': {
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                  description: 'User ID',
                },
              ],
              get: {
                summary: 'Get user by ID',
                responses: {
                  '200': { description: 'Success' },
                  '404': { description: 'Not found' },
                },
              },
            },
          },
          components: {
            securitySchemes: {
              bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
              },
              apiKey: {
                type: 'apiKey',
                in: 'header',
                name: 'X-API-Key',
              },
            },
          },
        };

        const specPath = path.join(tempDir, 'openapi.json');
        await fs.writeFile(specPath, JSON.stringify(spec), 'utf-8');

        const schema = await importer.importFromFile(specPath);

        expect(schema.id).toBe('test-api');
        expect(schema.name).toBe('Test API');
        expect(schema.version).toBe('1.0.0');
        expect(schema.description).toBe('Test API description');
        expect(schema.baseURL).toBe('https://api.test.com');
        expect(schema.metadata?.source).toBe('imported');
        expect(schema.metadata?.sourceFile).toBe(specPath);

        expect(schema.endpoints).toHaveLength(3);

        // Check GET /users
        const listUsers = schema.endpoints.find(
          e => e.path === '/users' && e.method === HTTPMethod.GET
        );
        expect(listUsers).toBeDefined();
        expect(listUsers!.description).toBe('List users');
        expect(listUsers!.parameters).toHaveLength(1);
        expect(listUsers!.parameters![0].name).toBe('page');
        expect(listUsers!.parameters![0].type).toBe('number');
        expect(listUsers!.parameters![0].required).toBe(false);
        expect(listUsers!.responses?.['200']).toBeDefined();
        expect(listUsers!.responses?.['200'].contentType).toBe('application/json');

        // Check POST /users
        const createUser = schema.endpoints.find(
          e => e.path === '/users' && e.method === HTTPMethod.POST
        );
        expect(createUser).toBeDefined();
        expect(createUser!.requestBody).toBeDefined();
        expect(createUser!.requestBody!.required).toBe(true);
        expect(createUser!.requestBody!.contentType).toBe('application/json');

        // Check GET /users/{id}
        const getUser = schema.endpoints.find(
          e => e.path === '/users/{id}' && e.method === HTTPMethod.GET
        );
        expect(getUser).toBeDefined();
        expect(getUser!.parameters).toHaveLength(1);
        expect(getUser!.parameters![0].name).toBe('id');
        expect(getUser!.parameters![0].required).toBe(true);

        // Check authentication
        expect(schema.authentication).toBeDefined();
        expect(schema.authentication!.type).toBe('bearer');
      });

      it('should handle YAML format', async () => {
        const yamlContent = `
openapi: 3.0.0
info:
  title: YAML API
  version: 1.0.0
servers:
  - url: https://api.yaml.com
paths:
  /items:
    get:
      summary: Get items
      responses:
        '200':
          description: Success
`;

        const specPath = path.join(tempDir, 'openapi.yaml');
        await fs.writeFile(specPath, yamlContent, 'utf-8');

        const schema = await importer.importFromFile(specPath);

        expect(schema.name).toBe('YAML API');
        expect(schema.baseURL).toBe('https://api.yaml.com');
        expect(schema.endpoints).toHaveLength(1);
      });

      it('should handle headers in parameters', async () => {
        const spec = {
          openapi: '3.0.0',
          info: { title: 'Header API', version: '1.0.0' },
          paths: {
            '/data': {
              get: {
                parameters: [
                  {
                    name: 'X-Request-ID',
                    in: 'header',
                    required: true,
                    schema: { type: 'string' },
                    description: 'Request identifier',
                  },
                  {
                    name: 'X-Client-Version',
                    in: 'header',
                    required: false,
                    schema: { type: 'string' },
                  },
                ],
                responses: { '200': { description: 'Success' } },
              },
            },
          },
        };

        const specPath = path.join(tempDir, 'header-api.json');
        await fs.writeFile(specPath, JSON.stringify(spec), 'utf-8');

        const schema = await importer.importFromFile(specPath);
        const endpoint = schema.endpoints[0];

        expect(endpoint.headers).toBeDefined();
        expect(endpoint.headers).toHaveLength(2);
        expect(endpoint.headers![0].name).toBe('X-Request-ID');
        expect(endpoint.headers![0].required).toBe(true);
        expect(endpoint.headers![1].name).toBe('X-Client-Version');
        expect(endpoint.headers![1].required).toBe(false);
      });
    });

    describe('OpenAPI v2 (Swagger)', () => {
      it('should import basic Swagger v2 spec', async () => {
        const spec = {
          swagger: '2.0',
          info: {
            title: 'Swagger API',
            version: '2.0.0',
            description: 'Swagger description',
          },
          host: 'api.swagger.com',
          basePath: '/v2',
          schemes: ['https'],
          paths: {
            '/pets': {
              get: {
                summary: 'List pets',
                produces: ['application/json'],
                parameters: [
                  {
                    name: 'limit',
                    in: 'query',
                    type: 'integer',
                    description: 'Max number of pets',
                  },
                ],
                responses: {
                  '200': {
                    description: 'Success',
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
              post: {
                summary: 'Create pet',
                consumes: ['application/json'],
                parameters: [
                  {
                    name: 'body',
                    in: 'body',
                    required: true,
                    schema: {
                      type: 'object',
                      required: ['name'],
                      properties: {
                        name: { type: 'string' },
                        tag: { type: 'string' },
                      },
                    },
                  },
                ],
                responses: {
                  '201': { description: 'Created' },
                },
              },
            },
            '/pets/{id}': {
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  type: 'integer',
                  description: 'Pet ID',
                },
              ],
              get: {
                summary: 'Get pet by ID',
                responses: {
                  '200': { description: 'Success' },
                  '404': { description: 'Not found' },
                },
              },
            },
          },
          securityDefinitions: {
            api_key: {
              type: 'apiKey',
              name: 'api_key',
              in: 'header',
            },
          },
        };

        const specPath = path.join(tempDir, 'swagger.json');
        await fs.writeFile(specPath, JSON.stringify(spec), 'utf-8');

        const schema = await importer.importFromFile(specPath);

        expect(schema.id).toBe('swagger-api');
        expect(schema.name).toBe('Swagger API');
        expect(schema.version).toBe('2.0.0');
        expect(schema.baseURL).toBe('https://api.swagger.com/v2');
        expect(schema.endpoints).toHaveLength(3);

        // Check parameter types are mapped correctly
        const listPets = schema.endpoints.find(
          e => e.path === '/pets' && e.method === HTTPMethod.GET
        );
        expect(listPets!.parameters![0].type).toBe('number');

        // Check request body
        const createPet = schema.endpoints.find(
          e => e.path === '/pets' && e.method === HTTPMethod.POST
        );
        expect(createPet!.requestBody).toBeDefined();
        expect(createPet!.requestBody!.contentType).toBe('application/json');

        // Check authentication
        expect(schema.authentication).toBeDefined();
        expect(schema.authentication!.type).toBe('apiKey');
      });

      it('should handle missing schemes and default to https', async () => {
        const spec = {
          swagger: '2.0',
          info: { title: 'No Scheme API', version: '1.0.0' },
          host: 'api.test.com',
          paths: {
            '/test': {
              get: { responses: { '200': { description: 'OK' } } },
            },
          },
        };

        const specPath = path.join(tempDir, 'no-scheme.json');
        await fs.writeFile(specPath, JSON.stringify(spec), 'utf-8');

        const schema = await importer.importFromFile(specPath);
        expect(schema.baseURL).toBe('https://api.test.com');
      });
    });

    it('should generate valid API ID from title', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'My Complex API Name!', version: '1.0.0' },
        paths: {},
      };

      const specPath = path.join(tempDir, 'complex.json');
      await fs.writeFile(specPath, JSON.stringify(spec), 'utf-8');

      const schema = await importer.importFromFile(specPath);
      expect(schema.id).toBe('my-complex-api-name');
    });

    it('should throw error for invalid spec', async () => {
      const invalidSpec = {
        invalid: 'not an openapi spec',
      };

      const specPath = path.join(tempDir, 'invalid.json');
      await fs.writeFile(specPath, JSON.stringify(invalidSpec), 'utf-8');

      await expect(importer.importFromFile(specPath)).rejects.toThrow(
        'Not a valid OpenAPI specification'
      );
    });

    it('should handle OAuth2 security', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'OAuth API', version: '1.0.0' },
        paths: {},
        components: {
          securitySchemes: {
            oauth2: {
              type: 'oauth2',
              flows: {
                authorizationCode: {
                  authorizationUrl: 'https://auth.test.com/oauth/authorize',
                  tokenUrl: 'https://auth.test.com/oauth/token',
                  scopes: {
                    read: 'Read access',
                    write: 'Write access',
                  },
                },
              },
            },
          },
        },
      };

      const specPath = path.join(tempDir, 'oauth.json');
      await fs.writeFile(specPath, JSON.stringify(spec), 'utf-8');

      const schema = await importer.importFromFile(specPath);
      expect(schema.authentication).toBeDefined();
      expect(schema.authentication!.type).toBe('oauth2');
      expect(schema.authentication!.details).toBeDefined();
    });

    it('should handle $ref resolution', async () => {
      const spec = {
        openapi: '3.0.0',
        info: { title: 'Ref API', version: '1.0.0' },
        paths: {
          '/users': {
            get: {
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: { $ref: '#/components/schemas/UserList' },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            UserList: {
              type: 'object',
              properties: {
                users: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/User' },
                },
              },
            },
            User: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
              },
            },
          },
        },
      };

      const specPath = path.join(tempDir, 'ref-api.json');
      await fs.writeFile(specPath, JSON.stringify(spec), 'utf-8');

      const schema = await importer.importFromFile(specPath);
      
      // Should still import successfully even with refs
      expect(schema.endpoints).toHaveLength(1);
      expect(schema.endpoints[0].responses?.['200']).toBeDefined();
    });
  });
});