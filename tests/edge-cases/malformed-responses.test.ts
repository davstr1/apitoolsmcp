import { ResponseAnalyzer } from '../../src/services/response-analyzer';
import * as nock from 'nock';
import fetch from 'node-fetch';

describe('Edge Cases: Malformed Responses', () => {
  let analyzer: ResponseAnalyzer;
  
  beforeEach(() => {
    analyzer = new ResponseAnalyzer();
    nock.cleanAll();
  });
  
  afterEach(() => {
    nock.cleanAll();
  });
  
  it('should handle invalid JSON with UTF-8 BOM', async () => {
    const bomJson = '\ufeff{"data": "test"}';
    nock('https://api.example.com')
      .get('/bom-json')
      .reply(200, bomJson, { 'Content-Type': 'application/json' });
    
    const response = await fetch('https://api.example.com/bom-json');
    const analysis = await analyzer.analyze(response);
    
    expect(analysis.dataType).toBe('json');
    expect(analysis.structure).toBeDefined();
  });
  
  it('should handle truncated JSON', async () => {
    nock('https://api.example.com')
      .get('/truncated')
      .reply(200, '{"data": "test", "items": [1, 2, 3', {
        'Content-Type': 'application/json'
      });
    
    const response = await fetch('https://api.example.com/truncated');
    const analysis = await analyzer.analyze(response);
    
    expect(analysis.dataType).toBe('text');
    expect(analysis.error).toBeDefined();
  });
  
  it('should handle mixed content types', async () => {
    // JSON content with HTML content-type
    nock('https://api.example.com')
      .get('/mixed')
      .reply(200, '{"data": "test"}', {
        'Content-Type': 'text/html'
      });
    
    const response = await fetch('https://api.example.com/mixed');
    const analysis = await analyzer.analyze(response);
    
    expect(analysis.contentType).toBe('text/html');
    // Should still detect JSON structure
    expect(analysis.dataType).toBe('json');
  });
  
  it('should handle empty response with various content types', async () => {
    const contentTypes = [
      'application/json',
      'text/plain',
      'text/html',
      'application/xml',
    ];
    
    for (const contentType of contentTypes) {
      nock('https://api.example.com')
        .get(`/empty-${contentType.replace('/', '-')}`)
        .reply(200, '', { 'Content-Type': contentType });
      
      const response = await fetch(
        `https://api.example.com/empty-${contentType.replace('/', '-')}`
      );
      const analysis = await analyzer.analyze(response);
      
      expect(analysis.contentType).toBe(contentType);
      expect(analysis.exampleData).toBe('');
    }
  });
  
  it('should handle very large responses', async () => {
    // Create a large JSON array
    const largeArray = Array(10000).fill({ id: 1, data: 'test' });
    
    nock('https://api.example.com')
      .get('/large')
      .reply(200, JSON.stringify(largeArray), {
        'Content-Type': 'application/json'
      });
    
    const response = await fetch('https://api.example.com/large');
    const analysis = await analyzer.analyze(response);
    
    expect(analysis.dataType).toBe('json');
    expect(analysis.structure.type).toBe('array');
    expect(analysis.hasArray).toBe(true);
  });
  
  it('should handle responses with null bytes', async () => {
    const dataWithNull = 'data\x00with\x00null\x00bytes';
    
    nock('https://api.example.com')
      .get('/null-bytes')
      .reply(200, dataWithNull, {
        'Content-Type': 'text/plain'
      });
    
    const response = await fetch('https://api.example.com/null-bytes');
    const analysis = await analyzer.analyze(response);
    
    expect(analysis.dataType).toBe('text');
    expect(analysis.exampleData).toBeDefined();
  });
  
  it('should handle invalid UTF-8 sequences', async () => {
    // Invalid UTF-8 sequence
    const invalidUtf8 = Buffer.from([0xff, 0xfe, 0xfd]);
    
    nock('https://api.example.com')
      .get('/invalid-utf8')
      .reply(200, invalidUtf8, {
        'Content-Type': 'text/plain'
      });
    
    const response = await fetch('https://api.example.com/invalid-utf8');
    const analysis = await analyzer.analyze(response);
    
    expect(analysis.dataType).toBe('binary');
  });
});