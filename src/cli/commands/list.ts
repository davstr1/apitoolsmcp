import chalk from 'chalk';
import { getConfig } from '../../config/loader';
import { YAMLScanner } from '../../schemas/yaml-scanner';
import { OpenAPIScanner } from '../../services/openapi-scanner';
import inquirer from 'inquirer';

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
      console.log(chalk.yellow('No API schemas found in the configured directory.'));
      
      // Check for OpenAPI files in the project
      console.log(chalk.cyan('\nScanning for OpenAPI specifications in the project...'));
      const openApiScanner = new OpenAPIScanner();
      const foundFiles = await openApiScanner.scan();
      
      if (foundFiles.length > 0) {
        console.log(chalk.green(`\nFound ${foundFiles.length} OpenAPI specification(s):\n`));
        
        for (const file of foundFiles) {
          console.log(chalk.cyan(`📄 ${file.path}`));
          if (file.title) console.log(`   Title: ${file.title}`);
          if (file.version) console.log(`   Version: OpenAPI ${file.version}`);
          if (file.description) console.log(`   Description: ${file.description}`);
          console.log();
        }
        
        const { importNow } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'importNow',
            message: 'Would you like to import these OpenAPI specifications?',
            default: true,
          },
        ]);
        
        if (importNow) {
          console.log(chalk.yellow('\nTo import, use: api-tools-mcp import <file-path>'));
          console.log(chalk.gray('Example: api-tools-mcp import ' + foundFiles[0].path));
        }
      } else {
        console.log(chalk.yellow('\nNo OpenAPI specifications found in the project.'));
        console.log(chalk.gray('To add an API, use: api-tools-mcp add'));
      }
      
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