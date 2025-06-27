import * as fs from 'fs/promises';
import * as path from 'path';

export interface FoundOpenAPIFile {
  path: string;
  type: 'yaml' | 'json';
  version?: '2.0' | '3.0' | '3.1';
  title?: string;
  description?: string;
}

export class OpenAPIScanner {
  private commonLocations = [
    '.openapi',
    'openapi',
    'docs',
    'api-docs',
    'swagger',
    'api',
    '.api',
  ];

  private commonFilenames = [
    'openapi.json',
    'openapi.yaml',
    'openapi.yml',
    'swagger.json',
    'swagger.yaml',
    'swagger.yml',
    'api-spec.json',
    'api-spec.yaml',
    'api-spec.yml',
    'api.json',
    'api.yaml',
    'api.yml',
  ];

  async scan(baseDir: string = process.cwd()): Promise<FoundOpenAPIFile[]> {
    const found: FoundOpenAPIFile[] = [];
    
    // Check common locations
    for (const location of this.commonLocations) {
      const dirPath = path.join(baseDir, location);
      try {
        const stats = await fs.stat(dirPath);
        if (stats.isDirectory()) {
          const filesInDir = await this.scanDirectory(dirPath);
          found.push(...filesInDir);
        }
      } catch {
        // Directory doesn't exist, continue
      }
    }

    // Check root directory for common filenames
    for (const filename of this.commonFilenames) {
      const filePath = path.join(baseDir, filename);
      try {
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          const openApiFile = await this.checkFile(filePath);
          if (openApiFile) {
            found.push(openApiFile);
          }
        }
      } catch {
        // File doesn't exist, continue
      }
    }

    // Also scan the entire project (limited depth)
    const projectFiles = await this.scanDirectory(baseDir, 3);
    found.push(...projectFiles);

    // Remove duplicates
    const unique = Array.from(new Map(found.map(f => [f.path, f])).values());
    
    return unique;
  }

  private async scanDirectory(dir: string, maxDepth: number = 5, currentDepth: number = 0): Promise<FoundOpenAPIFile[]> {
    if (currentDepth >= maxDepth) return [];
    
    const found: FoundOpenAPIFile[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        // Skip node_modules and hidden directories
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const subFiles = await this.scanDirectory(fullPath, maxDepth, currentDepth + 1);
          found.push(...subFiles);
        } else if (entry.isFile() && this.isOpenAPICandidate(entry.name)) {
          const openApiFile = await this.checkFile(fullPath);
          if (openApiFile) {
            found.push(openApiFile);
          }
        }
      }
    } catch {
      // Error reading directory, skip
    }
    
    return found;
  }

  private isOpenAPICandidate(filename: string): boolean {
    const lower = filename.toLowerCase();
    return (
      (lower.includes('openapi') || lower.includes('swagger') || lower.includes('api')) &&
      (lower.endsWith('.json') || lower.endsWith('.yaml') || lower.endsWith('.yml'))
    );
  }

  private async checkFile(filePath: string): Promise<FoundOpenAPIFile | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const type = filePath.endsWith('.json') ? 'json' : 'yaml';
      
      let data: any;
      if (type === 'json') {
        data = JSON.parse(content);
      } else {
        // For YAML, we'll need to parse it
        const yaml = await import('js-yaml');
        data = yaml.load(content);
      }

      // Check if it's an OpenAPI document
      if (this.isOpenAPIDocument(data)) {
        const version = this.detectVersion(data);
        const info = data.info || {};
        
        return {
          path: filePath,
          type,
          version,
          title: info.title,
          description: info.description,
        };
      }
    } catch {
      // Not a valid OpenAPI file
    }
    
    return null;
  }

  private isOpenAPIDocument(data: any): boolean {
    if (!data || typeof data !== 'object') return false;
    
    // OpenAPI 3.x
    if (data.openapi && typeof data.openapi === 'string' && data.openapi.startsWith('3.')) {
      return true;
    }
    
    // Swagger 2.0
    if (data.swagger && data.swagger === '2.0') {
      return true;
    }
    
    return false;
  }

  private detectVersion(data: any): '2.0' | '3.0' | '3.1' | undefined {
    if (data.openapi) {
      if (data.openapi.startsWith('3.1')) return '3.1';
      if (data.openapi.startsWith('3.0')) return '3.0';
    }
    if (data.swagger === '2.0') return '2.0';
    
    return undefined;
  }
}