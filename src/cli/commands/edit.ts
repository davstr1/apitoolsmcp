import inquirer from 'inquirer';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import chalk from 'chalk';
import { APISchema } from '../../types/api-schema';
import { getConfig } from '../../config/loader';
import { YAMLScanner } from '../../schemas/yaml-scanner';

export async function editCommand(apiId: string): Promise<void> {
  try {
    const config = await getConfig();
    const scanner = new YAMLScanner(config.schemaDirectory);
    const schemas = await scanner.scanDirectory();
    
    const schema = schemas.find(s => s.id === apiId);
    if (!schema) {
      console.error(chalk.red(`API with ID '${apiId}' not found`));
      process.exit(1);
    }

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'API Name:',
        default: schema.name,
      },
      {
        type: 'input',
        name: 'version',
        message: 'API Version:',
        default: schema.version,
      },
      {
        type: 'input',
        name: 'description',
        message: 'API Description:',
        default: schema.description || '',
      },
      {
        type: 'input',
        name: 'baseURL',
        message: 'Base URL:',
        default: schema.baseURL,
      },
    ]);

    const updatedSchema: APISchema = {
      ...schema,
      name: answers.name,
      version: answers.version,
      description: answers.description || undefined,
      baseURL: answers.baseURL,
      metadata: {
        ...schema.metadata,
        lastModified: new Date().toISOString(),
      },
    };

    const yamlContent = yaml.dump(updatedSchema, { indent: 2 });
    const filename = `${apiId}.yaml`;
    const filepath = path.join(config.schemaDirectory, filename);

    await fs.writeFile(filepath, yamlContent, 'utf-8');

    console.log(chalk.green(`✓ API schema updated successfully: ${filepath}`));
  } catch (error) {
    console.error(chalk.red('Error editing API schema:'), error);
    process.exit(1);
  }
}