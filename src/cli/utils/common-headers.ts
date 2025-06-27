export interface CommonHeader {
  name: string;
  value?: string;
  example?: string;
  description: string;
  configurable: boolean;
}

export const commonHeaders: CommonHeader[] = [
  {
    name: 'Authorization',
    description: 'Bearer token authentication',
    example: 'Bearer YOUR_TOKEN_HERE',
    configurable: true,
  },
  {
    name: 'X-API-Key',
    description: 'API key authentication',
    example: 'your-api-key-here',
    configurable: true,
  },
  {
    name: 'Content-Type',
    value: 'application/json',
    description: 'Request content type',
    configurable: false,
  },
  {
    name: 'Accept',
    value: 'application/json',
    description: 'Accepted response type',
    configurable: false,
  },
  {
    name: 'User-Agent',
    description: 'Custom user agent',
    example: 'MyApp/1.0',
    configurable: true,
  },
  {
    name: 'X-Request-ID',
    description: 'Request tracking ID',
    example: 'uuid-here',
    configurable: true,
  },
  {
    name: 'X-Client-Version',
    description: 'Client version header',
    example: '1.0.0',
    configurable: true,
  },
];