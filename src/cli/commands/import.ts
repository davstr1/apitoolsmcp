import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as yaml from 'js-yaml';
import inquirer from 'inquirer';
import fetch from 'node-fetch';
import { OpenAPIImporter } from '../../services/openapi-importer';
import { getConfig } from '../../config/loader';

interface ImportOptions {
  name?: string;
}

export async function importCommand(source: string, options: ImportOptions): Promise<void> {
  try {
    console.log(chalk.cyan('🔄 Importing OpenAPI specification...\n'));
    
    const importer = new OpenAPIImporter();
    let schema;
    
    // Check if source is a URL or file path
    if (source.startsWith('http://') || source.startsWith('https://')) {
      console.log(chalk.gray(`Fetching from: ${source}`));
      
      // Download the file first
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }
      
      const content = await response.text();
      const isJson = source.endsWith('.json') || response.headers.get('content-type')?.includes('json');
      
      // Just save content to temp file without parsing here
      
      // Save to temp file for processing
      const tempFile = path.join(process.cwd(), `.temp-openapi.${isJson ? 'json' : 'yaml'}`);
      await fs.writeFile(tempFile, content);
      
      try {
        schema = await importer.importFromFile(tempFile);
      } finally {
        // Clean up temp file
        await fs.unlink(tempFile).catch(() => {});
      }
    } else {
      // Import from local file
      const filePath = path.resolve(source);
      console.log(chalk.gray(`Importing from: ${filePath}`));
      
      schema = await importer.importFromFile(filePath);
    }
    
    // Override name if provided
    if (options.name) {
      schema.name = options.name;
      schema.id = options.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }
    
    // Show preview
    console.log(chalk.green('\n✓ Successfully parsed OpenAPI specification\n'));
    console.log(chalk.cyan('API Information:'));
    console.log(`  ID: ${schema.id}`);
    console.log(`  Name: ${schema.name}`);
    console.log(`  Version: ${schema.version}`);
    console.log(`  Base URL: ${schema.baseURL}`);
    console.log(`  Endpoints: ${schema.endpoints.length}`);
    if (schema.description) {
      console.log(`  Description: ${schema.description}`);
    }
    
    // Show some endpoints
    console.log(chalk.cyan('\nEndpoints:'));
    const endpointsToShow = schema.endpoints.slice(0, 5);
    for (const endpoint of endpointsToShow) {
      console.log(`  ${endpoint.method} ${endpoint.path}`);
      if (endpoint.description) {
        console.log(chalk.gray(`    ${endpoint.description}`));
      }
    }
    
    if (schema.endpoints.length > 5) {
      console.log(chalk.gray(`  ... and ${schema.endpoints.length - 5} more`));
    }
    
    // Confirm import
    const { confirmImport } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmImport',
        message: 'Import this API specification?',
        default: true,
      },
    ]);
    
    if (!confirmImport) {
      console.log(chalk.yellow('\nImport cancelled'));
      return;
    }
    
    // Save the schema
    const config = await getConfig();
    const yamlContent = yaml.dump(schema, { indent: 2 });
    const filename = `${schema.id}.yaml`;
    const filepath = path.join(config.schemaDirectory, filename);
    
    await fs.mkdir(config.schemaDirectory, { recursive: true });
    await fs.writeFile(filepath, yamlContent, 'utf-8');
    
    console.log(chalk.green(`\n✓ API schema imported successfully: ${filepath}`));
    console.log(chalk.gray('\nThe API is now available for use with the MCP server.'));
    
  } catch (error) {
    console.error(chalk.red('Error importing OpenAPI specification:'), error);
    process.exit(1);
  }
}