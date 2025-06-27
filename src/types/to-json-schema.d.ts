declare module 'to-json-schema' {
  interface Options {
    required?: boolean;
    arrays?: {
      mode?: 'first' | 'all' | 'uniform';
    };
    objects?: {
      additionalProperties?: boolean;
    };
    strings?: {
      detectFormat?: boolean;
    };
    postProcessFn?: (type: string, schema: any, value: any, defaultFunc: Function) => any;
  }

  function toJsonSchema(value: any, options?: Options): any;
  
  export = toJsonSchema;
}