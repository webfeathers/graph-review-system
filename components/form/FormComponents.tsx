// components/form/FormComponents.tsx
import React, { ReactNode } from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string | null;
  touched?: boolean;
  required?: boolean;
  helpText?: string;
  className?: string;
  children: ReactNode;
}

/**
 * FormField component that wraps a form input with label and error message
 */
export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  error,
  touched,
  required,
  helpText,
  className = '',
  children
}) => {
  const showError = error && touched;
  
  return (
    <div className={`mb-4 ${className}`}>
      <label 
        htmlFor={id} 
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      
      {children}
      
      {helpText && !showError && (
        <p className="mt-1 text-sm text-gray-500">{helpText}</p>
      )}
      
      {showError && (
        <p className="mt-1 text-sm text-red-600" id={`${id}-error`}>{error}</p>
      )}
    </div>
  );
};

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string | null;
  touched?: boolean;
  required?: boolean;
  helpText?: string;
  containerClassName?: string;
}

/**
 * TextInput component with integrated validation
 */
export const TextInput: React.FC<TextInputProps> = ({
  id,
  label,
  error,
  touched,
  required,
  helpText,
  containerClassName,
  className = '',
  ...props
}) => {
  const showError = error && touched;
  const inputClasses = `
    w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500
    ${showError 
      ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' 
      : 'border-gray-300 focus:border-blue-500'}
    ${className}
  `;
  
  return (
    <FormField
      id={id}
      label={label}
      error={error}
      touched={touched}
      required={required}
      helpText={helpText}
      className={containerClassName}
    >
      <input
        id={id}
        className={inputClasses}
        aria-invalid={showError ? 'true' : 'false'}
        aria-describedby={showError ? `${id}-error` : undefined}
        {...props}
      />
    </FormField>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  error?: string | null;
  touched?: boolean;
  required?: boolean;
  helpText?: string;
  containerClassName?: string;
}

/**
 * TextArea component with integrated validation
 */
export const TextArea: React.FC<TextAreaProps> = ({
  id,
  label,
  error,
  touched,
  required,
  helpText,
  containerClassName,
  className = '',
  ...props
}) => {
  const showError = error && touched;
  const textareaClasses = `
    w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500
    ${showError 
      ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-red-500' 
      : 'border-gray-300 focus:border-blue-500'}
    ${className}
  `;
  
  return (
    <FormField
      id={id}
      label={label}
      error={error}
      touched={touched}
      required={required}
      helpText={helpText}
      className={containerClassName}
    >
      <textarea
        id={id}
        className={textareaClasses}
        aria-invalid={showError ? 'true' : 'false'}
        aria-describedby={showError ? `${id}-error` : undefined}
        {...props}
      />
    </FormField>
  );
};

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  error?: string | null;
  touched?: boolean;
  required?: boolean;
  helpText?: string;
  containerClassName?: string;
  options: Array<{ value: string; label: string }>;
}

/**
 * SelectInput component with integrated validation
 */
export const SelectInput: React.FC<SelectInputProps> = ({
  id,
  label,
  error,
  touched,
  required,
  helpText,
  containerClassName,
  options,
  className = '',
  ...props
}) => {
  const showError = error && touched;
  const selectClasses = `
    w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500
    ${showError 
      ? 'border-red-300 text-red-900 focus:border-red-500 focus:ring-red-500' 
      : 'border-gray-300 focus:border-blue-500'}
    ${className}
  `;
  
  return (
    <FormField
      id={id}
      label={label}
      error={error}
      touched={touched}
      required={required}
      helpText={helpText}
      className={containerClassName}
    >
      <select
        id={id}
        className={selectClasses}
        aria-invalid={showError ? 'true' : 'false'}
        aria-describedby={showError ? `${id}-error` : undefined}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FormField>
  );
};

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
  label: string;
  error?: string | null;
  touched?: boolean;
  helpText?: string;
  containerClassName?: string;
}

/**
 * Checkbox component with integrated validation
 */
export const Checkbox: React.FC<CheckboxProps> = ({
  id,
  label,
  error,
  touched,
  helpText,
  containerClassName,
  className = '',
  ...props
}) => {
  const showError = error && touched;
  
  return (
    <div className={`flex items-start ${containerClassName || ''}`}>
      <div className="flex items-center h-5">
        <input
          id={id}
          type="checkbox"
          className={`h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${className}`}
          aria-invalid={showError ? 'true' : 'false'}
          aria-describedby={showError ? `${id}-error` : undefined}
          {...props}
        />
      </div>
      <div className="ml-3 text-sm">
        <label htmlFor={id} className="font-medium text-gray-700">
          {label}
        </label>
        {helpText && !showError && (
          <p className="text-gray-500">{helpText}</p>
        )}
        {showError && (
          <p className="text-red-600" id={`${id}-error`}>{error}</p>
        )}
      </div>
    </div>
  );
};

interface FileInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
  label: string;
  error?: string | null;
  touched?: boolean;
  required?: boolean;
  helpText?: string;
  containerClassName?: string;
  preview?: string;
  onClearFile?: () => void;
}

/**
 * FileInput component with integrated validation and image preview
 */
export const FileInput: React.FC<FileInputProps> = ({
  id,
  label,
  error,
  touched,
  required,
  helpText,
  containerClassName,
  preview,
  onClearFile,
  className = '',
  ...props
}) => {
  const showError = error && touched;
  const inputClasses = `
    block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
    file:rounded-md file:border-0 file:text-sm file:font-semibold
    file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100
    ${className}
  `;
  
  return (
    <FormField
      id={id}
      label={label}
      error={error}
      touched={touched}
      required={required}
      helpText={helpText}
      className={containerClassName}
    >
      <div>
        <input
          id={id}
          type="file"
          className={inputClasses}
          aria-invalid={showError ? 'true' : 'false'}
          aria-describedby={showError ? `${id}-error` : undefined}
          {...props}
        />
        
        {preview && (
          <div className="mt-2 relative">
            <img 
              src={preview} 
              alt="File preview" 
              className="max-h-40 rounded border border-gray-300" 
            />
            {onClearFile && (
              <button
                type="button"
                onClick={onClearFile}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                aria-label="Remove file"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </FormField>
  );
};

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isSubmitting?: boolean;
  label: string;
  submittingLabel?: string;
}

/**
 * SubmitButton component with loading state
 */
export const SubmitButton: React.FC<SubmitButtonProps> = ({
  isSubmitting,
  label,
  submittingLabel = 'Submitting...',
  className = '',
  ...props
}) => {
  const buttonClasses = `
    px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm
    hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
    disabled:opacity-50 disabled:cursor-not-allowed
    ${className}
  `;
  
  return (
    <button
      type="submit"
      className={buttonClasses}
      disabled={isSubmitting}
      {...props}
    >
      {isSubmitting ? (
        <span className="flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {submittingLabel}
        </span>
      ) : (
        label
      )}
    </button>
  );
};

/**
 * Form component that provides context for form controls
 */
export const Form: React.FC<React.FormHTMLAttributes<HTMLFormElement>> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <form className={`space-y-6 ${className}`} {...props}>
      {children}
    </form>
  );
};