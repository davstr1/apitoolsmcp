import inquirer from 'inquirer';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import chalk from 'chalk';
import { APISchema, HTTPMethod } from '../../types/api-schema';
import { getConfig } from '../../config/loader';

export async function addManualCommand(): Promise<void> {
  try {
    const config = await getConfig();
    
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'id',
        message: 'API ID (unique identifier):',
        validate: (input) => input.length > 0 || 'API ID is required',
      },
      {
        type: 'input',
        name: 'name',
        message: 'API Name:',
        validate: (input) => input.length > 0 || 'API name is required',
      },
      {
        type: 'input',
        name: 'version',
        message: 'API Version:',
        default: '1.0.0',
      },
      {
        type: 'input',
        name: 'description',
        message: 'API Description (optional):',
      },
      {
        type: 'input',
        name: 'baseURL',
        message: 'Base URL:',
        validate: (input) => input.length > 0 || 'Base URL is required',
      },
    ]);

    const endpoints = [];
    let addMore = true;

    while (addMore) {
      console.log(chalk.cyan('\nAdd an endpoint:'));
      
      const endpoint = await inquirer.prompt([
        {
          type: 'input',
          name: 'path',
          message: 'Endpoint path (e.g., /users/{id}):',
          validate: (input) => input.length > 0 || 'Path is required',
        },
        {
          type: 'list',
          name: 'method',
          message: 'HTTP Method:',
          choices: Object.values(HTTPMethod),
        },
        {
          type: 'input',
          name: 'description',
          message: 'Endpoint description (optional):',
        },
      ]);

      endpoints.push(endpoint);

      const { continueAdding } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'continueAdding',
          message: 'Add another endpoint?',
          default: false,
        },
      ]);

      addMore = continueAdding;
    }

    const schema: APISchema = {
      id: answers.id,
      name: answers.name,
      version: answers.version,
      description: answers.description || undefined,
      baseURL: answers.baseURL,
      endpoints,
      metadata: {
        source: 'manual',
        importedAt: new Date().toISOString(),
      },
    };

    const yamlContent = yaml.dump(schema, { indent: 2 });
    const filename = `${answers.id}.yaml`;
    const filepath = path.join(config.schemaDirectory, filename);

    await fs.mkdir(config.schemaDirectory, { recursive: true });
    await fs.writeFile(filepath, yamlContent, 'utf-8');

    console.log(chalk.green(`✓ API schema created successfully: ${filepath}`));
  } catch (error) {
    console.error(chalk.red('Error creating API schema:'), error);
    process.exit(1);
  }
}