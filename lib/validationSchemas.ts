// lib/validationSchemas.ts
import { 
  createValidator, 
  required, 
  minLength, 
  maxLength,
  fileType,
  maxFileSize,
  email,
  matches,
  pattern,
  url,
  ValidationRule,
  FieldValidator
} from './validationUtils';
import { 
  FIELD_LIMITS, 
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZES
} from '../constants';

// Define schema types
export type SchemaType = 'review' | 'comment' | 'profile' | 'registration' | 'login' | 'userManagement';
export type ValidationSchema = Record<string, FieldValidator<any>>;

/**
 * Validation schema for review forms
 */
export const reviewValidationSchema: ValidationSchema = {
  title: createValidator(
    required('Title is required'),
    minLength(3, 'Title must be at least 3 characters'),
    maxLength(FIELD_LIMITS.TITLE_MAX_LENGTH, `Title must be no more than ${FIELD_LIMITS.TITLE_MAX_LENGTH} characters`)
  ),
  description: createValidator(
    required('Description is required'),
    minLength(10, 'Description must be at least 10 characters'),
    maxLength(FIELD_LIMITS.DESCRIPTION_MAX_LENGTH, `Description must be no more than ${FIELD_LIMITS.DESCRIPTION_MAX_LENGTH} characters`)
  ),
  kantataProjectId: createValidator(
    required('Kantata (Mavenlink) Project ID is required')
  ),
  accountName: createValidator(
    required('Account name is required')
  ),
  graphImage: createValidator(
    fileType(ALLOWED_IMAGE_TYPES, 'File must be a valid image (JPEG, PNG, GIF, or WEBP)'),
    maxFileSize(MAX_FILE_SIZES.IMAGE, `File size must be less than ${MAX_FILE_SIZES.IMAGE / (1024 * 1024)}MB`)
  ),
  status: createValidator(
    required('Status is required'),
    pattern(/^(Submitted|In Review|Needs Work|Approved)$/, 'Invalid status')
  ),
  customerFolder: createValidator(
    url('Please enter a valid URL for the customer folder')
  ),
  handoffLink: createValidator(
    url('Please enter a valid URL for the handoff link')
  )
};

/**
 * Validation schema for comments
 */
export const commentValidationSchema: ValidationSchema = {
  content: createValidator(
    required('Comment cannot be empty'),
    minLength(3, 'Comment must be at least 3 characters'),
    maxLength(FIELD_LIMITS.COMMENT_MAX_LENGTH, `Comment must be no more than ${FIELD_LIMITS.COMMENT_MAX_LENGTH} characters`)
  )
};

/**
 * Validation schema for user profile
 */
export const profileValidationSchema: ValidationSchema = {
  name: createValidator(
    required('Name is required'),
    minLength(2, 'Name must be at least 2 characters'),
    maxLength(FIELD_LIMITS.NAME_MAX_LENGTH, `Name must be no more than ${FIELD_LIMITS.NAME_MAX_LENGTH} characters`)
  ),
  email: createValidator(
    required('Email is required'),
    email('Please enter a valid email address')
  ),
  avatar: createValidator(
    fileType(ALLOWED_IMAGE_TYPES, 'File must be a valid image (JPEG, PNG, GIF, or WEBP)'),
    maxFileSize(MAX_FILE_SIZES.AVATAR, `File size must be less than ${MAX_FILE_SIZES.AVATAR / (1024 * 1024)}MB`)
  )
};

/**
 * Validation schema for registration
 */
export const registrationValidationSchema: ValidationSchema = {
  name: profileValidationSchema.name,
  email: profileValidationSchema.email,
  password: createValidator(
    required('Password is required'),
    minLength(8, 'Password must be at least 8 characters'),
    pattern(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
    )
  ),
  confirmPassword: createValidator(
    required('Please confirm your password'),
    matches('password', 'Passwords do not match')
  )
};

/**
 * Validation schema for login
 */
export const loginValidationSchema: ValidationSchema = {
  email: profileValidationSchema.email,
  password: createValidator(
    required('Password is required')
  )
};

/**
 * Validation schema for admin user management
 */
export const userManagementValidationSchema: ValidationSchema = {
  role: createValidator(
    required('Role is required'),
    pattern(/^(Member|Admin)$/, 'Invalid role')
  )
};

/**
 * Helper function to dynamically build a validation schema
 */
export function buildValidationSchema(fields: {
  schema: SchemaType;
  fields: string[];
}[]): ValidationSchema {
  const result: ValidationSchema = {};
  
  fields.forEach(({ schema, fields }) => {
    let sourceSchema: ValidationSchema | null = null;
    
    switch (schema) {
      case 'review':
        sourceSchema = reviewValidationSchema;
        break;
      case 'comment':
        sourceSchema = commentValidationSchema;
        break;
      case 'profile':
        sourceSchema = profileValidationSchema;
        break;
      case 'registration':
        sourceSchema = registrationValidationSchema;
        break;
      case 'login':
        sourceSchema = loginValidationSchema;
        break;
      case 'userManagement':
        sourceSchema = userManagementValidationSchema;
        break;
    }
    
    if (sourceSchema) {
      fields.forEach(field => {
        if (sourceSchema && field in sourceSchema) {
          result[field] = sourceSchema[field];
        }
      });
    }
  });
  
  return result;
}