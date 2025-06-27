import { ResponseAnalyzer } from '../../src/services/response-analyzer';
import { HttpResponse } from '../../src/types/http';

describe('ResponseAnalyzer', () => {
  let analyzer: ResponseAnalyzer;

  beforeEach(() => {
    analyzer = new ResponseAnalyzer();
  });

  describe('analyze', () => {
    it('should analyze JSON response', async () => {
      const response: HttpResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: {
          users: [
            { id: 1, name: 'John', email: 'john@example.com' },
            { id: 2, name: 'Jane', email: 'jane@example.com' },
          ],
          total: 2,
        },
        responseTime: 100,
      };

      const analysis = await analyzer.analyze(response);

      expect(analysis.contentType).toBe('application/json');
      expect(analysis.structure).toBeDefined();
      expect(analysis.structure.type).toBe('object');
      expect(analysis.structure.properties).toBeDefined();
      expect(analysis.structure.properties.users).toBeDefined();
      expect(analysis.structure.properties.users.type).toBe('array');
      expect(analysis.structure.properties.total).toBeDefined();
      expect(analysis.structure.properties.total.type).toBe('number');
      expect(analysis.examples).toHaveLength(1);
      expect(analysis.examples[0]).toEqual(response.body);
    });

    it('should analyze XML response', async () => {
      const response: HttpResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/xml' },
        body: `<?xml version="1.0"?>
        <users>
          <user>
            <id>1</id>
            <name>John</name>
          </user>
          <user>
            <id>2</id>
            <name>Jane</name>
          </user>
        </users>`,
        responseTime: 100,
      };

      const analysis = await analyzer.analyze(response);

      expect(analysis.contentType).toBe('application/xml');
      expect(analysis.structure).toBeDefined();
      expect(analysis.structure.type).toBe('xml');
      expect(analysis.structure.rootElement).toBe('users');
      expect(analysis.examples).toHaveLength(1);
    });

    it('should analyze HTML response', async () => {
      const response: HttpResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'text/html' },
        body: '<html><head><title>Test</title></head><body><h1>Hello</h1></body></html>',
        responseTime: 100,
      };

      const analysis = await analyzer.analyze(response);

      expect(analysis.contentType).toBe('text/html');
      expect(analysis.structure).toBeDefined();
      expect(analysis.structure.type).toBe('html');
      expect(analysis.structure.hasTitle).toBe(true);
      expect(analysis.structure.bodyPreview).toContain('Hello');
    });

    it('should analyze plain text response', async () => {
      const response: HttpResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'text/plain' },
        body: 'Hello, World!',
        responseTime: 100,
      };

      const analysis = await analyzer.analyze(response);

      expect(analysis.contentType).toBe('text/plain');
      expect(analysis.structure).toBeDefined();
      expect(analysis.structure.type).toBe('text');
      expect(analysis.structure.length).toBe(13);
      expect(analysis.examples[0]).toBe('Hello, World!');
    });

    it('should handle complex nested JSON', async () => {
      const response: HttpResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: {
          data: {
            users: [
              {
                id: 1,
                profile: {
                  name: 'John',
                  age: 30,
                  addresses: [
                    { type: 'home', city: 'NYC' },
                    { type: 'work', city: 'SF' },
                  ],
                },
              },
            ],
            metadata: {
              page: 1,
              total: 100,
              hasMore: true,
            },
          },
        },
        responseTime: 100,
      };

      const analysis = await analyzer.analyze(response);

      expect(analysis.structure.type).toBe('object');
      expect(analysis.structure.properties.data.type).toBe('object');
      expect(analysis.structure.properties.data.properties.users.type).toBe('array');
      expect(analysis.structure.properties.data.properties.users.items.type).toBe('object');
      expect(analysis.structure.properties.data.properties.users.items.properties.profile.type).toBe('object');
      expect(analysis.structure.properties.data.properties.metadata.properties.hasMore.type).toBe('boolean');
    });

    it('should handle empty response', async () => {
      const response: HttpResponse = {
        status: 204,
        statusText: 'No Content',
        headers: {},
        body: '',
        responseTime: 50,
      };

      const analysis = await analyzer.analyze(response);

      expect(analysis.contentType).toBe('unknown');
      expect(analysis.structure).toBeDefined();
      expect(analysis.structure.type).toBe('empty');
      expect(analysis.examples).toHaveLength(0);
    });

    it('should handle array response', async () => {
      const response: HttpResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: [
          { id: 1, name: 'Item 1' },
          { id: 2, name: 'Item 2' },
        ],
        responseTime: 100,
      };

      const analysis = await analyzer.analyze(response);

      expect(analysis.structure.type).toBe('array');
      expect(analysis.structure.items).toBeDefined();
      expect(analysis.structure.items.type).toBe('object');
      expect(analysis.structure.items.properties.id.type).toBe('number');
      expect(analysis.structure.items.properties.name.type).toBe('string');
    });

    it('should handle malformed JSON gracefully', async () => {
      const response: HttpResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: 'Invalid JSON {',
        responseTime: 100,
      };

      const analysis = await analyzer.analyze(response);

      expect(analysis.contentType).toBe('application/json');
      expect(analysis.structure.type).toBe('string');
      expect(analysis.error).toContain('Failed to parse');
    });

    it('should detect content type from response', async () => {
      const response: HttpResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json; charset=utf-8' },
        body: { test: true },
        responseTime: 100,
      };

      const analysis = await analyzer.analyze(response);

      expect(analysis.contentType).toBe('application/json');
    });

    it('should handle binary content type', async () => {
      const response: HttpResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'image/png' },
        body: Buffer.from('fake-image-data'),
        responseTime: 100,
      };

      const analysis = await analyzer.analyze(response);

      expect(analysis.contentType).toBe('image/png');
      expect(analysis.structure.type).toBe('binary');
      expect(analysis.structure.mimeType).toBe('image/png');
    });

    it('should extract schema from complex arrays', async () => {
      const response: HttpResponse = {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: {
          items: [
            { id: 1, name: 'A', tags: ['tag1', 'tag2'], active: true },
            { id: 2, name: 'B', tags: ['tag3'], active: false },
            { id: 3, name: 'C', tags: [], active: true },
          ],
        },
        responseTime: 100,
      };

      const analysis = await analyzer.analyze(response);

      const itemsSchema = analysis.structure.properties.items;
      expect(itemsSchema.type).toBe('array');
      expect(itemsSchema.items.properties.tags.type).toBe('array');
      expect(itemsSchema.items.properties.tags.items.type).toBe('string');
      expect(itemsSchema.items.properties.active.type).toBe('boolean');
    });
  });
});