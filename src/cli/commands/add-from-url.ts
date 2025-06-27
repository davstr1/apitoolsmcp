import inquirer from 'inquirer';
import chalk from 'chalk';
import { URL } from 'url';
import { HttpMethod } from '../../types/http';
import { commonHeaders } from '../utils/common-headers';
import { buildParameters } from '../utils/parameter-builder';
import { ApiTester } from '../../services/api-tester';
import { ResponseAnalyzer } from '../../services/response-analyzer';
import { SchemaGenerator } from '../../services/schema-generator';
import { getConfig } from '../../config/loader';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { InvalidInputError, FileWriteError } from '../../errors';
import { errorHandler } from '../../errors/error-handler';
import { logger } from '../../utils/logger';

export async function addFromUrlCommand(): Promise<void> {
  try {
    console.log(chalk.cyan('\n🌐 Add API from URL\n'));

    // Step 1: Get URL
    const { apiUrl } = await inquirer.prompt([
      {
        type: 'input',
        name: 'apiUrl',
        message: 'Enter the API endpoint URL:',
        validate: input => {
          try {
            new URL(input);
            return true;
          } catch {
            return 'Please enter a valid URL';
          }
        },
      },
    ]);

    // Parse and validate URL
    const parsedUrl = new URL(apiUrl);

    // Validate URL protocol
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new InvalidInputError('url', apiUrl, 'HTTP or HTTPS URL');
    }

    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    const pathWithQuery = `${parsedUrl.pathname}${parsedUrl.search}`;

    console.log(chalk.gray(`Base URL: ${baseUrl}`));
    console.log(chalk.gray(`Path: ${pathWithQuery}`));

    // Step 2: Get basic API info
    const apiInfo = await inquirer.prompt([
      {
        type: 'input',
        name: 'id',
        message: 'API ID (unique identifier):',
        default: parsedUrl.hostname.replace(/\./g, '-'),
        validate: input => input.length > 0 || 'API ID is required',
      },
      {
        type: 'input',
        name: 'name',
        message: 'API Name:',
        default: parsedUrl.hostname,
        validate: input => input.length > 0 || 'API name is required',
      },
      {
        type: 'input',
        name: 'description',
        message: 'API Description (optional):',
      },
    ]);

    // Step 3: Select HTTP method
    const { method } = await inquirer.prompt([
      {
        type: 'list',
        name: 'method',
        message: 'HTTP Method:',
        choices: Object.values(HttpMethod),
        default: parsedUrl.search ? HttpMethod.GET : HttpMethod.POST,
      },
    ]);

    // Step 4: Configure headers
    console.log(chalk.cyan('\n📋 Configure Headers\n'));
    const headers: Record<string, string> = {};

    const { useCommonHeaders } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'useCommonHeaders',
        message: 'Select common headers to include:',
        choices: commonHeaders.map(h => ({
          name: `${h.name}: ${h.example || h.value}`,
          value: h.name,
          checked: false,
        })),
      },
    ]);

    // Configure selected common headers
    for (const headerName of useCommonHeaders) {
      const commonHeader = commonHeaders.find(h => h.name === headerName);
      if (commonHeader && commonHeader.configurable) {
        const { value } = await inquirer.prompt([
          {
            type: 'input',
            name: 'value',
            message: `Enter value for ${headerName}:`,
            default: commonHeader.example || commonHeader.value,
          },
        ]);
        headers[headerName] = value;
      } else if (commonHeader) {
        headers[headerName] = commonHeader.value!;
      }
    }

    // Add custom headers
    const addMore = true;
    while (addMore) {
      const { addCustom } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'addCustom',
          message: 'Add a custom header?',
          default: false,
        },
      ]);

      if (!addCustom) break;

      const customHeader = await inquirer.prompt([
        {
          type: 'input',
          name: 'name',
          message: 'Header name:',
          validate: input => input.length > 0 || 'Header name is required',
        },
        {
          type: 'input',
          name: 'value',
          message: 'Header value:',
          validate: input => input.length > 0 || 'Header value is required',
        },
      ]);

      headers[customHeader.name] = customHeader.value;
    }

    // Step 5: Configure parameters
    console.log(chalk.cyan('\n🔧 Configure Parameters\n'));
    const parameters = await buildParameters(parsedUrl, method);

    // Step 6: Test the API
    console.log(chalk.cyan('\n🧪 Testing API...\n'));

    const { confirmTest } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmTest',
        message: 'Execute test request to analyze response?',
        default: true,
      },
    ]);

    let schema;
    if (confirmTest) {
      const tester = new ApiTester();
      const testResult = await tester.executeRequest({
        url: apiUrl,
        method: method as HttpMethod,
        headers,
        params: parameters.reduce(
          (acc, p) => {
            if (p.location === 'query' && p.value) {
              acc[p.name] = p.value;
            }
            return acc;
          },
          {} as Record<string, string>
        ),
      });

      if (testResult.success) {
        console.log(
          chalk.green(
            `✓ Request successful (${testResult.response.status} ${testResult.response.statusText})`
          )
        );
        console.log(chalk.gray(`Response time: ${testResult.response.responseTime}ms`));

        // Analyze response
        const analyzer = new ResponseAnalyzer();
        const analysis = await analyzer.analyze(testResult.response);

        // Generate schema
        const generator = new SchemaGenerator();
        schema = await generator.generate({
          apiInfo,
          baseUrl,
          path: parsedUrl.pathname,
          method,
          headers,
          parameters,
          testResult,
          analysis,
        });

        // Show preview
        console.log(chalk.cyan('\n📄 Generated Schema Preview:\n'));
        console.log(chalk.gray(yaml.dump(schema, { indent: 2 })));
      } else {
        console.log(chalk.red(`✗ Request failed: ${testResult.error}`));
        console.log(chalk.yellow('Generating schema without response analysis...'));

        // Generate basic schema without response
        const generator = new SchemaGenerator();
        schema = await generator.generateBasic({
          apiInfo,
          baseUrl,
          path: parsedUrl.pathname,
          method,
          headers,
          parameters,
        });
      }
    } else {
      // Generate basic schema without testing
      const generator = new SchemaGenerator();
      schema = await generator.generateBasic({
        apiInfo,
        baseUrl,
        path: parsedUrl.pathname,
        method,
        headers,
        parameters,
      });
    }

    // Step 7: Save schema
    const { confirmSave } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmSave',
        message: 'Save this API schema?',
        default: true,
      },
    ]);

    if (confirmSave) {
      const config = await getConfig();
      const yamlContent = yaml.dump(schema, { indent: 2 });
      const filename = `${apiInfo.id}.yaml`;
      const filepath = path.join(config.schemaDirectory, filename);

      try {
        await fs.mkdir(config.schemaDirectory, { recursive: true });
        await fs.writeFile(filepath, yamlContent, 'utf-8');
      } catch (error) {
        throw new FileWriteError(filepath, error as Error);
      }

      console.log(chalk.green(`\n✓ API schema saved successfully: ${filepath}`));
      console.log(chalk.gray('\nThe API is now available for use with the MCP server.'));
    }
  } catch (error) {
    const errorResponse = errorHandler.handle(error as Error);
    console.error(chalk.red('Error adding API from URL:'), errorResponse.error.message);

    if (errorResponse.error.details) {
      logger.debug('Error details', errorResponse.error.details);
    }

    process.exit(1);
  }
}
