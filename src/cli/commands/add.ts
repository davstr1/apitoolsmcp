import inquirer from 'inquirer';
import chalk from 'chalk';
import { addManualCommand } from './add-manual';
import { addFromUrlCommand } from './add-from-url';

export async function addCommand(): Promise<void> {
  try {
    const { mode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'mode',
        message: 'How would you like to add an API?',
        choices: [
          {
            name: '🌐 Test a live API endpoint',
            value: 'url',
          },
          {
            name: '📝 Create manually',
            value: 'manual',
          },
        ],
      },
    ]);

    if (mode === 'url') {
      await addFromUrlCommand();
    } else {
      await addManualCommand();
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'User force closed the prompt') {
      console.log(chalk.yellow('\nOperation cancelled'));
    } else {
      console.error(chalk.red('Error in add command:'), error);
    }
    process.exit(1);
  }
}