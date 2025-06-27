import chalk from 'chalk';

interface ImportOptions {
  name?: string;
}

export async function importCommand(url: string, options: ImportOptions): Promise<void> {
  console.log(chalk.yellow('OpenAPI import feature not yet implemented'));
  console.log(`Would import from: ${url}`);
  if (options.name) {
    console.log(`With name: ${options.name}`);
  }
}