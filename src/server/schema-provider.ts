import { APISchema } from '../types/api-schema';
import { Config } from '../types/config';
import { YAMLScanner } from '../schemas/yaml-scanner';

export class SchemaProvider {
  private schemas: Map<string, APISchema> = new Map();
  private config: Config;
  private yamlScanner: YAMLScanner;

  constructor(config: Config) {
    this.config = config;
    this.yamlScanner = new YAMLScanner(config.schemaDirectory);
  }

  async loadSchemas(): Promise<void> {
    try {
      const schemas = await this.yamlScanner.scanDirectory();
      
      for (const schema of schemas) {
        this.schemas.set(schema.id, schema);
      }
    } catch (error) {
      console.error('Failed to load schemas:', error);
      throw error;
    }
  }

  getSchema(id: string): APISchema | undefined {
    return this.schemas.get(id);
  }

  listSchemas(): APISchema[] {
    return Array.from(this.schemas.values());
  }

  getSchemaCount(): number {
    return this.schemas.size;
  }

  findSchemaByName(name: string): APISchema | undefined {
    return Array.from(this.schemas.values()).find(
      schema => schema.name.toLowerCase() === name.toLowerCase()
    );
  }

  searchSchemas(query: string): APISchema[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.schemas.values()).filter(
      schema => 
        schema.name.toLowerCase().includes(lowerQuery) ||
        schema.description?.toLowerCase().includes(lowerQuery) ||
        schema.baseURL.toLowerCase().includes(lowerQuery)
    );
  }
}