import chalk from 'chalk';
import { getConfig } from '../../config/loader';
import { YAMLScanner } from '../../schemas/yaml-scanner';

interface ListOptions {
  search?: string;
}

export async function listCommand(options: ListOptions): Promise<void> {
  try {
    const config = await getConfig();
    const scanner = new YAMLScanner(config.schemaDirectory);
    let schemas = await scanner.scanDirectory();

    if (options.search) {
      const searchLower = options.search.toLowerCase();
      schemas = schemas.filter(schema => 
        schema.name.toLowerCase().includes(searchLower) ||
        schema.description?.toLowerCase().includes(searchLower) ||
        schema.id.toLowerCase().includes(searchLower)
      );
    }

    if (schemas.length === 0) {
      console.log(chalk.yellow('No API schemas found'));
      return;
    }

    console.log(chalk.bold(`\nFound ${schemas.length} API schema(s):\n`));

    for (const schema of schemas) {
      console.log(chalk.cyan(`ID: ${schema.id}`));
      console.log(`  Name: ${schema.name}`);
      console.log(`  Version: ${schema.version}`);
      console.log(`  Base URL: ${schema.baseURL}`);
      console.log(`  Endpoints: ${schema.endpoints.length}`);
      if (schema.description) {
        console.log(`  Description: ${schema.description}`);
      }
      console.log();
    }
  } catch (error) {
    console.error(chalk.red('Error listing API schemas:'), error);
    process.exit(1);
  }
}