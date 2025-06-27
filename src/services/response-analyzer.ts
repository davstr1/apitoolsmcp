import { HttpResponse } from '../types/http';

export interface ResponseAnalysis {
  contentType: string;
  dataType: 'json' | 'xml' | 'html' | 'text' | 'binary';
  structure?: any;
  hasArray: boolean;
  hasObject: boolean;
  fields?: string[];
  exampleData?: any;
}

export class ResponseAnalyzer {
  async analyze(response: HttpResponse): Promise<ResponseAnalysis> {
    const rawContentType = response.headers['content-type'] || 'unknown';
    const contentType = rawContentType.split(';')[0].trim();
    const dataType = this.detectDataType(rawContentType, response.body);

    const analysis: ResponseAnalysis = {
      contentType,
      dataType,
      hasArray: false,
      hasObject: false,
    };

    if (dataType === 'json' && response.body) {
      // If body is a string, try to parse it
      if (typeof response.body === 'string') {
        try {
          const parsed = JSON.parse(response.body);
          const jsonAnalysis = this.analyzeJson(parsed);
          analysis.structure = jsonAnalysis.structure;
          analysis.hasArray = jsonAnalysis.hasArray;
          analysis.hasObject = jsonAnalysis.hasObject;
          analysis.fields = jsonAnalysis.fields;
          analysis.exampleData = parsed;
        } catch {
          // Invalid JSON, treat as text
          analysis.dataType = 'text';
          analysis.exampleData = response.body.substring(0, 1000);
          analysis.structure = { type: 'text' };
        }
      } else {
        // Already parsed JSON
        const jsonAnalysis = this.analyzeJson(response.body);
        analysis.structure = jsonAnalysis.structure;
        analysis.hasArray = jsonAnalysis.hasArray;
        analysis.hasObject = jsonAnalysis.hasObject;
        analysis.fields = jsonAnalysis.fields;
        analysis.exampleData = response.body;
      }
    } else if (dataType === 'text' && typeof response.body === 'string') {
      // Try to parse as JSON in case content-type is wrong
      try {
        const parsed = JSON.parse(response.body);
        const jsonAnalysis = this.analyzeJson(parsed);
        analysis.dataType = 'json';
        analysis.structure = jsonAnalysis.structure;
        analysis.hasArray = jsonAnalysis.hasArray;
        analysis.hasObject = jsonAnalysis.hasObject;
        analysis.fields = jsonAnalysis.fields;
        analysis.exampleData = parsed;
      } catch {
        // Keep as text
        analysis.exampleData = response.body.substring(0, 1000); // First 1000 chars
        analysis.structure = { type: 'text' };
      }
    } else {
      analysis.exampleData =
        typeof response.body === 'string' ? response.body.substring(0, 1000) : 'Binary data';
      analysis.structure = { type: dataType };
    }

    return analysis;
  }

  private detectDataType(contentType: string, body: any): ResponseAnalysis['dataType'] {
    // Remove charset and other parameters from content type
    const baseContentType = contentType.split(';')[0].trim().toLowerCase();

    if (baseContentType.includes('application/json')) return 'json';
    if (baseContentType.includes('application/xml') || baseContentType.includes('text/xml'))
      return 'xml';
    if (baseContentType.includes('text/html')) return 'html';
    if (baseContentType.includes('text/')) return 'text';
    if (baseContentType.includes('image/') || baseContentType.includes('audio/') || 
        baseContentType.includes('video/') || baseContentType.includes('application/octet-stream')) {
      return 'binary';
    }

    // Try to detect from body
    if (Buffer.isBuffer(body)) return 'binary';
    if (typeof body === 'object' && body !== null) return 'json';
    if (typeof body === 'string') {
      if (body.trim().startsWith('<')) return body.includes('<!DOCTYPE html') ? 'html' : 'xml';
      if (body.trim().startsWith('{') || body.trim().startsWith('[')) return 'json';
      return 'text';
    }

    return 'binary';
  }

  private analyzeJson(data: any): {
    structure: any;
    hasArray: boolean;
    hasObject: boolean;
    fields: string[];
  } {
    const structure = this.extractStructure(data);
    const hasArray = Array.isArray(data) || this.containsArray(data);
    const hasObject = typeof data === 'object' && !Array.isArray(data);
    const fields = this.extractFields(data);

    return { structure, hasArray, hasObject, fields };
  }

  private extractStructure(data: any, maxDepth = 3, currentDepth = 0): any {
    if (currentDepth >= maxDepth) return '...';

    if (data === null) return 'null';
    if (Array.isArray(data)) {
      if (data.length === 0) return { type: 'array', items: {} };
      return { 
        type: 'array', 
        items: this.extractStructure(data[0], maxDepth, currentDepth + 1) 
      };
    }
    if (typeof data === 'object') {
      const properties: any = {};
      for (const [key, value] of Object.entries(data)) {
        properties[key] = this.extractStructure(value, maxDepth, currentDepth + 1);
      }
      return { type: 'object', properties };
    }
    return { type: typeof data };
  }

  private containsArray(data: any): boolean {
    if (Array.isArray(data)) return true;
    if (typeof data === 'object' && data !== null) {
      for (const value of Object.values(data)) {
        if (this.containsArray(value)) return true;
      }
    }
    return false;
  }

  private extractFields(data: any, prefix = ''): string[] {
    const fields: string[] = [];

    if (Array.isArray(data) && data.length > 0) {
      return this.extractFields(data[0], `${prefix}[]`);
    }

    if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        const fieldPath = prefix ? `${prefix}.${key}` : key;
        fields.push(fieldPath);

        if (typeof value === 'object' && value !== null) {
          fields.push(...this.extractFields(value, fieldPath));
        }
      }
    }

    return fields;
  }
}
