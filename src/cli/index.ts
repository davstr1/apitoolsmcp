#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { addCommand } from './commands/add';
import { editCommand } from './commands/edit';
import { listCommand } from './commands/list';
import { validateCommand } from './commands/validate';
import { importCommand } from './commands/import';

const program = new Command();

program
  .name('api-tools-mcp')
  .description('CLI tool for managing API schemas for MCP')
  .version('0.3.0');

program
  .command('add')
  .description('Add a new API schema')
  .action(addCommand);

program
  .command('edit <apiId>')
  .description('Edit an existing API schema')
  .action(editCommand);

program
  .command('list')
  .description('List all API schemas')
  .option('-s, --search <query>', 'Search for APIs by name or description')
  .option('-t, --test', 'Run quick test on selected API')
  .action(listCommand);

program
  .command('validate [path]')
  .description('Validate API schema file(s)')
  .action(validateCommand);

program
  .command('import <url>')
  .description('Import an OpenAPI specification from URL')
  .option('-n, --name <name>', 'Name for the imported API')
  .action(importCommand);

program.on('command:*', () => {
  console.error(chalk.red('Invalid command: %s'), program.args.join(' '));
  console.log('See --help for a list of available commands.');
  process.exit(1);
});

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}