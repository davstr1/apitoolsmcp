import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import { getConfig } from '../../config/loader';
import { Parser } from '../../schemas/parser';
import { Validator } from '../../schemas/validator';

export async function validateCommand(targetPath?: string): Promise<void> {
  try {
    const config = await getConfig();
    const parser = new Parser();
    const validator = new Validator();
    
    const pathToValidate = targetPath 
      ? path.resolve(targetPath)
      : config.schemaDirectory;

    const stats = await fs.stat(pathToValidate);
    const files: string[] = [];

    if (stats.isDirectory()) {
      files.push(...await findYAMLFiles(pathToValidate));
    } else if (stats.isFile()) {
      files.push(pathToValidate);
    }

    if (files.length === 0) {
      console.log(chalk.yellow('No YAML files found to validate'));
      return;
    }

    let hasErrors = false;

    for (const file of files) {
      console.log(chalk.cyan(`Validating: ${file}`));
      
      const schema = await parser.parseYAMLFile(file);
      if (!schema) {
        console.log(chalk.red('  ✗ Failed to parse file'));
        hasErrors = true;
        continue;
      }

      const validation = validator.validate(schema);
      if (validation.valid) {
        console.log(chalk.green('  ✓ Valid'));
      } else {
        console.log(chalk.red('  ✗ Invalid'));
        validation.errors?.forEach(err => {
          console.log(chalk.red(`    - ${err}`));
        });
        hasErrors = true;
      }
    }

    process.exit(hasErrors ? 1 : 0);
  } catch (error) {
    console.error(chalk.red('Error validating schemas:'), error);
    process.exit(1);
  }
}

async function findYAMLFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      files.push(...await findYAMLFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml'))) {
      files.push(fullPath);
    }
  }
  
  return files;
}