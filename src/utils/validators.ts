import { InvalidInputError, MissingRequiredFieldError } from '../errors';

export interface ValidationRule<T> {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  enum?: T[];
  custom?: (value: T) => boolean | string;
}

export interface ValidationSchema {
  [field: string]: ValidationRule<any>;
}

export class Validator {
  public static validate<T extends Record<string, any>>(data: T, schema: ValidationSchema): void {
    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];

      // Check required fields
      if (rules.required && (value === undefined || value === null || value === '')) {
        throw new MissingRequiredFieldError(field);
      }

      // Skip validation if field is not present and not required
      if (value === undefined || value === null) {
        continue;
      }

      // Type validation
      if (rules.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rules.type) {
          throw new InvalidInputError(field, value, rules.type);
        }
      }

      // String validations
      if (typeof value === 'string') {
        if (rules.pattern && !rules.pattern.test(value)) {
          throw new InvalidInputError(field, value, `matching pattern ${rules.pattern}`);
        }
        if (rules.minLength && value.length < rules.minLength) {
          throw new InvalidInputError(
            field,
            value,
            `string with minimum length ${rules.minLength}`
          );
        }
        if (rules.maxLength && value.length > rules.maxLength) {
          throw new InvalidInputError(
            field,
            value,
            `string with maximum length ${rules.maxLength}`
          );
        }
      }

      // Number validations
      if (typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
          throw new InvalidInputError(field, value, `number >= ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
          throw new InvalidInputError(field, value, `number <= ${rules.max}`);
        }
      }

      // Enum validation
      if (rules.enum && !rules.enum.includes(value)) {
        throw new InvalidInputError(field, value, `one of: ${rules.enum.join(', ')}`);
      }

      // Custom validation
      if (rules.custom) {
        const result = rules.custom(value);
        if (result !== true) {
          const message = typeof result === 'string' ? result : 'custom validation failed';
          throw new InvalidInputError(field, value, message);
        }
      }
    }
  }

  // Common validators
  public static readonly common = {
    url: {
      type: 'string' as const,
      pattern: /^https?:\/\/.+/,
      custom: (value: string) => {
        try {
          new URL(value);
          return true;
        } catch {
          return 'valid URL';
        }
      },
    },
    email: {
      type: 'string' as const,
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    httpMethod: {
      type: 'string' as const,
      enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
    },
    port: {
      type: 'number' as const,
      min: 1,
      max: 65535,
    },
    nonEmptyString: {
      type: 'string' as const,
      minLength: 1,
    },
  };
}

// Type guards
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}
