export interface Config {
  schemaDirectory: string;
  remoteImports?: {
    enabled: boolean;
    cacheDuration?: number;
    timeout?: number;
  };
  watchMode?: boolean;
  server?: {
    host?: string;
    port?: number;
  };
  validation?: {
    strict: boolean;
    warnOnUnknownFields?: boolean;
  };
  http?: {
    defaultTimeout?: number; // Default request timeout in milliseconds (default: 30000)
    operationTimeout?: number; // Default operation timeout in milliseconds (default: 300000)
    maxRetries?: number; // Default number of retry attempts (default: 3)
    retryDelay?: number; // Initial retry delay in milliseconds (default: 1000)
  };
}