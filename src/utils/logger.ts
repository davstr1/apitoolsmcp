import winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

// Determine if we're in development or production
const isDevelopment = process.env.NODE_ENV !== 'production';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
  verbose: 4,
};

// Create formatters
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]: ${message}${metaStr}`;
  })
);

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create the logger
export const logger = winston.createLogger({
  levels: logLevels,
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
      silent: process.env.NODE_ENV === 'test', // Disable console logs during tests
    }),
    // File transport for errors
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
      format: fileFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
      format: fileFormat,
    }),
  ],
});

// Create a child logger for MCP server specifically
export const mcpLogger = logger.child({ component: 'mcp-server' });

// Export log levels for reference
export const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  VERBOSE: 'verbose',
} as const;

// Helper function to log API requests
export function logApiRequest(
  method: string,
  path: string,
  statusCode: number,
  responseTime: number,
  error?: Error
) {
  const logData = {
    method,
    path,
    statusCode,
    responseTime: `${responseTime}ms`,
  };

  if (error) {
    logger.error('API request failed', { ...logData, error: error.message, stack: error.stack });
  } else if (statusCode >= 400) {
    logger.warn('API request returned error status', logData);
  } else {
    logger.info('API request completed', logData);
  }
}

// Helper function to log schema operations
export function logSchemaOperation(
  operation: 'create' | 'update' | 'delete' | 'validate' | 'import',
  schemaId: string,
  success: boolean,
  details?: any
) {
  const logData = {
    operation,
    schemaId,
    success,
    ...details,
  };

  if (success) {
    logger.info(`Schema ${operation} successful`, logData);
  } else {
    logger.error(`Schema ${operation} failed`, logData);
  }
}

// Export default logger
export default logger;