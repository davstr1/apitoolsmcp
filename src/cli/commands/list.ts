import chalk from 'chalk';
import { getConfig } from '../../config/loader';
import { YAMLScanner } from '../../schemas/yaml-scanner';
import { OpenAPIScanner } from '../../services/openapi-scanner';
import { ApiTester } from '../../services/api-tester';
import { HTTPMethod } from '../../types/api-schema';
import { HttpMethod } from '../../types/http';
import inquirer from 'inquirer';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';

interface ListOptions {
  search?: string;
  test?: boolean;
}

function getSourceIcon(source?: string): string {
  switch (source) {
    case 'manual': return '✏️';
    case 'tested': return '🧪';
    case 'imported': return '📥';
    case 'openapi': return '📄';
    case 'yaml': return '📝';
    default: return '❓';
  }
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
      // Source icon
      const sourceIcon = getSourceIcon(schema.metadata?.source);
      
      console.log(chalk.cyan(`${sourceIcon} ID: ${schema.id}`));
      console.log(`  Name: ${schema.name}`);
      console.log(`  Version: ${schema.version}`);
      console.log(`  Base URL: ${schema.baseURL}`);
      console.log(`  Endpoints: ${schema.endpoints.length}`);
      
      if (schema.description) {
        console.log(`  Description: ${schema.description}`);
      }
      
      // Display metadata
      if (schema.metadata) {
        console.log(chalk.gray(`  Source: ${schema.metadata.source || 'unknown'}`));
        
        if (schema.metadata.createdAt) {
          const created = new Date(schema.metadata.createdAt);
          console.log(chalk.gray(`  Created: ${created.toLocaleDateString()}`));
        }
        
        if (schema.metadata.lastTestedAt) {
          const tested = new Date(schema.metadata.lastTestedAt);
          const isRecent = (Date.now() - tested.getTime()) < 24 * 60 * 60 * 1000; // 24 hours
          const color = isRecent ? chalk.green : chalk.yellow;
          console.log(color(`  Last tested: ${tested.toLocaleDateString()} ${tested.toLocaleTimeString()}`));
        }
        
        if (schema.metadata.testResults && schema.metadata.testResults.length > 0) {
          const successCount = schema.metadata.testResults.filter(r => r.success).length;
          const totalCount = schema.metadata.testResults.length;
          const successRate = (successCount / totalCount * 100).toFixed(0);
          const color = successCount === totalCount ? chalk.green : 
                        successCount > 0 ? chalk.yellow : chalk.red;
          console.log(color(`  Test success rate: ${successRate}% (${successCount}/${totalCount})`));
        }
      }
      
      console.log();
    }
    
    // Quick test feature
    if (options.test && schemas.length > 0) {
      const { selectedApi } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedApi',
          message: 'Select an API to test:',
          choices: schemas.map(s => ({
            name: `${s.name} (${s.id})`,
            value: s,
          })),
        },
      ]);
      
      if (selectedApi.endpoints.length === 0) {
        console.log(chalk.yellow('\nThis API has no endpoints to test.'));
        return;
      }
      
      const { selectedEndpoint } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedEndpoint',
          message: 'Select an endpoint to test:',
          choices: selectedApi.endpoints.map((e: any) => ({
            name: `${e.method} ${e.path} ${e.description ? '- ' + e.description : ''}`,
            value: e,
          })),
        },
      ]);
      
      console.log(chalk.cyan(`\nTesting ${selectedEndpoint.method} ${selectedApi.baseURL}${selectedEndpoint.path}...`));
      
      try {
        const tester = new ApiTester();
        const url = new URL(selectedEndpoint.path, selectedApi.baseURL).toString();
        
        const result = await tester.executeRequest({
          url,
          method: selectedEndpoint.method as HttpMethod,
          headers: {},
          timeout: 10000,
        });
        
        // Display test results
        console.log(chalk.bold('\nTest Results:'));
        console.log(`Status: ${result.response.status >= 200 && result.response.status < 300 ? chalk.green(result.response.status) : chalk.red(result.response.status)}`);
        console.log(`Response Time: ${result.response.responseTime}ms`);
        console.log(`Content Type: ${result.response.headers['content-type'] || 'unknown'}`);
        
        if (result.response.body) {
          console.log(chalk.bold('\nResponse Preview:'));
          const preview = typeof result.response.body === 'string' 
            ? result.response.body.substring(0, 200) 
            : JSON.stringify(result.response.body, null, 2).substring(0, 200);
          console.log(preview + (preview.length >= 200 ? '...' : ''));
        }
        
        // Update metadata with test result
        const testResult = {
          timestamp: new Date().toISOString(),
          endpoint: selectedEndpoint.path,
          method: selectedEndpoint.method as HTTPMethod,
          statusCode: result.response.status,
          responseTime: result.response.responseTime,
          success: result.response.status >= 200 && result.response.status < 300,
        };
        
        // Update the schema file
        if (!selectedApi.metadata) {
          selectedApi.metadata = {};
        }
        if (!selectedApi.metadata.testResults) {
          selectedApi.metadata.testResults = [];
        }
        selectedApi.metadata.testResults.push(testResult);
        selectedApi.metadata.lastTestedAt = testResult.timestamp;
        
        // Save updated schema
        const schemaPath = path.join(config.schemaDirectory, `${selectedApi.id}.yaml`);
        await fs.writeFile(schemaPath, yaml.dump(selectedApi), 'utf-8');
        
        console.log(chalk.green('\n✅ Test completed and results saved.'));
        
      } catch (error: any) {
        console.error(chalk.red('\nTest failed:'), error.message);
      }
    }
  } catch (error) {
    console.error(chalk.red('Error listing API schemas:'), error);
    process.exit(1);
  }
}