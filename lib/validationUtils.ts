// lib/validationUtils.ts
import { ValidationError } from './errorService';

/**
 * Type for validation rule functions
 */
export type ValidationRule<T> = (value: T, formValues?: any) => string | null;

/**
 * Type for field validator functions
 */
export type FieldValidator<T> = (value: T, formValues?: any) => string | null;

/**
 * Type for form values
 */
export type FormValues = Record<string, any>;

/**
 * Type for form errors
 */
export type FormErrors<T extends FormValues> = Partial<Record<keyof T, string>>;

/**
 * Creates a validator function from a set of rules
 */
export function createValidator<T>(...rules: ValidationRule<T>[]): FieldValidator<T> {
  return (value: T, formValues?: any): string | null => {
    for (const rule of rules) {
      const error = rule(value, formValues);
      if (error) {
        return error;
      }
    }
    return null;
  };
}

/**
 * Validates a complete form
 */
export function validateForm<T extends FormValues>(
  values: T,
  validationSchema: { [K in keyof T]?: FieldValidator<T[K]> }
): FormErrors<T> {
  const errors: FormErrors<T> = {};
  
  for (const key in validationSchema) {
    if (Object.prototype.hasOwnProperty.call(validationSchema, key)) {
      const validator = validationSchema[key];
      if (validator) {
        const error = validator(values[key], values);
        if (error) {
          errors[key] = error;
        }
      }
    }
  }
  
  return errors;
}

/**
 * Checks if a form has any validation errors
 */
export function hasErrors<T extends FormValues>(errors: FormErrors<T>): boolean {
  return Object.keys(errors).length > 0;
}

/**
 * Throws a ValidationError if a form has errors
 */
export function throwIfErrors<T extends FormValues>(
  errors: FormErrors<T>,
  message: string = 'Form validation failed'
): void {
  if (hasErrors(errors)) {
    throw new ValidationError(message, undefined, 'form_validation', errors);
  }
}

// Common validation rules - migrated from validation.ts where needed

export const required = (message: string = 'This field is required'): ValidationRule<any> => 
  (value) => {
    if (value === undefined || value === null || value === '') {
      return message;
    }
    return null;
  };

export const minLength = (
  min: number,
  message: string = `Must be at least ${min} characters`
): ValidationRule<string> => 
  (value) => {
    if (!value || value.length < min) {
      return message;
    }
    return null;
  };

export const maxLength = (
  max: number,
  message: string = `Must be no more than ${max} characters`
): ValidationRule<string> => 
  (value) => {
    if (value && value.length > max) {
      return message;
    }
    return null;
  };

export const pattern = (
  regex: RegExp,
  message: string = 'Invalid format'
): ValidationRule<string> => 
  (value) => {
    if (value && !regex.test(value)) {
      return message;
    }
    return null;
  };

export const email = (
  message: string = 'Invalid email address'
): ValidationRule<string> => 
  pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, message);

export const matches = (
  fieldName: string,
  message: string = 'Fields do not match'
): ValidationRule<any> => 
  (value, formValues) => {
    if (formValues && value !== formValues[fieldName]) {
      return message;
    }
    return null;
  };

export const url = (
  message: string = 'Please enter a valid URL'
): ValidationRule<string> => 
  (value) => {
    if (!value) return null;
    try {
      new URL(value);
      return null;
    } catch (e) {
      return message;
    }
  };

export const fileType = (
  allowedTypes: string[],
  message: string = `File type must be one of: ${allowedTypes.join(', ')}`
): ValidationRule<File | null | undefined> => 
  (file) => {
    if (file && !allowedTypes.includes(file.type)) {
      return message;
    }
    return null;
  };

export const maxFileSize = (
  maxSizeBytes: number,
  message: string = `File size must be less than ${maxSizeBytes / (1024 * 1024)}MB`
): ValidationRule<File | null | undefined> => 
  (file) => {
    if (file && file.size > maxSizeBytes) {
      return message;
    }
    return null;
  };