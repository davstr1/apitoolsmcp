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
}