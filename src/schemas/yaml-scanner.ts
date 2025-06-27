import * as fs from 'fs/promises';
import * as path from 'path';
import { APISchema } from '../types/api-schema';
import { Parser } from './parser';

export class YAMLScanner {
  private directory: string;
  private parser: Parser;

  constructor(directory: string) {
    this.directory = path.resolve(directory);
    this.parser = new Parser();
  }

  async scanDirectory(): Promise<APISchema[]> {
    const schemas: APISchema[] = [];
    
    try {
      const files = await this.findYAMLFiles(this.directory);
      
      for (const file of files) {
        try {
          const schema = await this.parser.parseYAMLFile(file);
          if (schema) {
            schemas.push(schema);
          }
        } catch (error) {
          console.error(`Failed to parse ${file}:`, error);
        }
      }
      
      return schemas;
    } catch (error) {
      console.error(`Failed to scan directory ${this.directory}:`, error);
      return schemas;
    }
  }

  private async findYAMLFiles(dir: string): Promise<string[]> {
    const yamlFiles: string[] = [];
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.findYAMLFiles(fullPath);
          yamlFiles.push(...subFiles);
        } else if (entry.isFile() && this.isYAMLFile(entry.name)) {
          yamlFiles.push(fullPath);
        }
      }
    } catch (error) {
      console.error(`Error reading directory ${dir}:`, error);
    }
    
    return yamlFiles;
  }

  private isYAMLFile(filename: string): boolean {
    const ext = path.extname(filename).toLowerCase();
    return ext === '.yaml' || ext === '.yml';
  }
}