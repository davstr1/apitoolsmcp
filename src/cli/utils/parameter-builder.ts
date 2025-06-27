import inquirer from 'inquirer';
import chalk from 'chalk';
import { URL } from 'url';
import { ParameterInfo } from '../../types/http';

export async function buildParameters(parsedUrl: URL, method: string): Promise<ParameterInfo[]> {
  const parameters: ParameterInfo[] = [];
  
  // Extract query parameters from URL
  const queryParams = Array.from(parsedUrl.searchParams.entries());
  
  if (queryParams.length > 0) {
    console.log(chalk.gray(`Found ${queryParams.length} query parameter(s) in URL`));
    
    // Configure each query parameter
    for (const [name, value] of queryParams) {
      console.log(chalk.cyan(`\nConfiguring parameter: ${name}`));
      console.log(chalk.gray(`Current value: ${value}`));
      
      const paramConfig = await inquirer.prompt([
        {
          type: 'input',
          name: 'description',
          message: `Description for '${name}':`,
          default: `${name} parameter`,
        },
        {
          type: 'list',
          name: 'type',
          message: `Type for '${name}':`,
          choices: ['string', 'number', 'boolean', 'array', 'object'],
          default: guessType(value),
        },
        {
          type: 'confirm',
          name: 'required',
          message: `Is '${name}' required?`,
          default: true,
        },
        {
          type: 'input',
          name: 'example',
          message: `Example value for '${name}':`,
          default: value,
        },
      ]);
      
      parameters.push({
        name,
        value,
        type: paramConfig.type,
        required: paramConfig.required,
        description: paramConfig.description,
        example: paramConfig.example,
        location: 'query',
      });
    }
  }
  
  // Ask about additional parameters
  let addMore = true;
  while (addMore) {
    const { addParam } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addParam',
        message: 'Add another parameter?',
        default: false,
      },
    ]);
    
    if (!addParam) break;
    
    const newParam = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Parameter name:',
        validate: (input) => input.length > 0 || 'Parameter name is required',
      },
      {
        type: 'list',
        name: 'location',
        message: 'Parameter location:',
        choices: method === 'GET' || method === 'HEAD' 
          ? ['query', 'header', 'path']
          : ['query', 'header', 'path', 'body'],
      },
      {
        type: 'list',
        name: 'type',
        message: 'Parameter type:',
        choices: ['string', 'number', 'boolean', 'array', 'object'],
        default: 'string',
      },
      {
        type: 'confirm',
        name: 'required',
        message: 'Is this parameter required?',
        default: false,
      },
      {
        type: 'input',
        name: 'description',
        message: 'Parameter description:',
      },
      {
        type: 'input',
        name: 'example',
        message: 'Example value:',
      },
    ]);
    
    parameters.push({
      name: newParam.name,
      type: newParam.type,
      required: newParam.required,
      description: newParam.description,
      example: newParam.example,
      location: newParam.location,
    });
  }
  
  // For POST/PUT/PATCH, ask about body parameters
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    const { hasBody } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'hasBody',
        message: 'Does this endpoint accept a request body?',
        default: true,
      },
    ]);
    
    if (hasBody) {
      console.log(chalk.cyan('\n📦 Configure Request Body\n'));
      
      let addBodyParam = true;
      while (addBodyParam) {
        const bodyParam = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Body parameter name:',
            validate: (input) => input.length > 0 || 'Parameter name is required',
          },
          {
            type: 'list',
            name: 'type',
            message: 'Parameter type:',
            choices: ['string', 'number', 'boolean', 'array', 'object'],
            default: 'string',
          },
          {
            type: 'confirm',
            name: 'required',
            message: 'Is this parameter required?',
            default: true,
          },
          {
            type: 'input',
            name: 'description',
            message: 'Parameter description:',
          },
          {
            type: 'input',
            name: 'example',
            message: 'Example value:',
          },
        ]);
        
        parameters.push({
          name: bodyParam.name,
          type: bodyParam.type,
          required: bodyParam.required,
          description: bodyParam.description,
          example: bodyParam.example,
          location: 'body',
        });
        
        const { continueAdding } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'continueAdding',
            message: 'Add another body parameter?',
            default: false,
          },
        ]);
        
        addBodyParam = continueAdding;
      }
    }
  }
  
  return parameters;
}

function guessType(value: string): string {
  if (value === 'true' || value === 'false') return 'boolean';
  if (!isNaN(Number(value))) return 'number';
  if (value.startsWith('[') || value.startsWith('{')) return 'object';
  return 'string';
}