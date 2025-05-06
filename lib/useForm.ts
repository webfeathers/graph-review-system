// lib/useForm.ts
import { useState, useCallback, useEffect } from 'react';
import { FormValues, FormErrors, validateForm, hasErrors } from './validationUtils';

// Define the type for a validator function
type ValidatorFn = (value: any, formValues?: any) => string | null;

interface UseFormOptions<T extends FormValues> {
  initialValues: T;
  validationSchema?: Partial<Record<keyof T, ValidatorFn>>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  onSubmit?: (values: T, helpers: FormHelpers<T>) => void | Promise<void>;
}

export interface FormHelpers<T extends FormValues> {
  resetForm: () => void;
  setValues: (values: Partial<T>) => void;
  setFieldValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setFieldError: <K extends keyof T>(field: K, error: string | null) => void;
  setErrors: (errors: FormErrors<T>) => void;
  validateForm: () => FormErrors<T>;
  validateField: <K extends keyof T>(field: K) => string | null;
  setSubmitting: (isSubmitting: boolean) => void;
  setTouched: (touched: Partial<Record<keyof T, boolean>>) => void;
  setFieldTouched: <K extends keyof T>(field: K, isTouched: boolean) => void;
}

export interface FormState<T extends FormValues> {
  values: T;
  errors: FormErrors<T>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

export interface UseFormReturn<T extends FormValues> extends FormState<T>, FormHelpers<T> {
  handleChange: <K extends keyof T>(field: K) => (e: React.ChangeEvent<any>) => void;
  handleBlur: <K extends keyof T>(field: K) => (e: React.FocusEvent<any>) => void;
  handleSubmit: (e?: React.FormEvent<HTMLFormElement>) => void;
}

/**
 * Custom hook for form handling with validation
 * 
 * @param options Form options
 * @returns Form state and handlers
 */
export function useForm<T extends FormValues>(options: UseFormOptions<T>): UseFormReturn<T> {
  const {
    initialValues,
    validationSchema = {},
    validateOnChange = false,
    validateOnBlur = true,
    onSubmit
  } = options;

  // Initialize form state
  const [formState, setFormState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    isValid: true
  });

  // Extract state for easier access
  const { values, errors, touched, isSubmitting, isValid } = formState;

  // Validate the entire form
  const validateFormValues = useCallback((): FormErrors<T> => {
    if (!validationSchema || Object.keys(validationSchema).length === 0) {
      return {};
    }
    
    const newErrors = validateForm(values, validationSchema);
    const formIsValid = !hasErrors(newErrors);
    
    // Only update state if errors or validity have changed
    setFormState(prev => {
      if (JSON.stringify(prev.errors) === JSON.stringify(newErrors) && prev.isValid === formIsValid) {
        return prev;
      }
      return {
        ...prev,
        errors: newErrors,
        isValid: formIsValid
      };
    });
    
    return newErrors;
  }, [values, validationSchema]);

  // Validate a single field
  const validateField = useCallback(<K extends keyof T>(field: K): string | null => {
    // Check if validationSchema exists
    if (!validationSchema) {
      return null;
    }
    
    // Safely access the validator - convert the field to string first to avoid TypeScript errors
    const fieldKey = String(field);
    
    // Check if the validator exists for this field
    if (!validationSchema.hasOwnProperty(fieldKey)) {
      return null;
    }
    
    // Get the validator and explicitly type it
    const validator = validationSchema[field as keyof typeof validationSchema] as ValidatorFn | undefined;
    
    if (!validator) {
      return null;
    }
    
    // Call the validator with the field value
    const error = validator(values[field], values);
    
    // Update the form state with the error
    setFormState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [field]: error
      }
    }));
    
    return error;
  }, [values, validationSchema]);

  // Reset form to initial values
  const resetForm = useCallback(() => {
    setFormState({
      values: initialValues,
      errors: {},
      touched: {},
      isSubmitting: false,
      isValid: true
    });
  }, [initialValues]);

  // Update all form values
  const setValues = useCallback((newValues: Partial<T>) => {
    setFormState(prev => ({
      ...prev,
      values: {
        ...prev.values,
        ...newValues
      }
    }));
  }, []);

  // Update a single field value
  const setFieldValue = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setFormState(prev => ({
      ...prev,
      values: {
        ...prev.values,
        [field]: value
      }
    }));
  }, []);

  // Set an error message for a field
  const setFieldError = useCallback(<K extends keyof T>(field: K, error: string | null) => {
    setFormState(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [field]: error
      }
    }));
  }, []);

  // Set all form errors
  const setErrors = useCallback((newErrors: FormErrors<T>) => {
    setFormState(prev => ({
      ...prev,
      errors: newErrors,
      isValid: !hasErrors(newErrors)
    }));
  }, []);

  // Set submitting state
  const setSubmitting = useCallback((isSubmitting: boolean) => {
    setFormState(prev => ({
      ...prev,
      isSubmitting
    }));
  }, []);

  // Set touched state for all fields
  const setTouched = useCallback((newTouched: Partial<Record<keyof T, boolean>>) => {
    setFormState(prev => ({
      ...prev,
      touched: {
        ...prev.touched,
        ...newTouched
      }
    }));
  }, []);

  // Set touched state for a single field
  const setFieldTouched = useCallback(<K extends keyof T>(field: K, isTouched: boolean) => {
    setFormState(prev => ({
      ...prev,
      touched: {
        ...prev.touched,
        [field]: isTouched
      }
    }));
  }, []);

  // Handle input change
  const handleChange = useCallback(<K extends keyof T>(field: K) => (e: React.ChangeEvent<any>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    
    setFormState(prev => ({
      ...prev,
      values: {
        ...prev.values,
        [field]: value
      }
    }));
    
    if (validateOnChange) {
      validateField(field);
    }
  }, [validateOnChange, validateField]);

  // Handle input blur
  const handleBlur = useCallback(<K extends keyof T>(field: K) => (e: React.FocusEvent<any>) => {
    setFormState(prev => ({
      ...prev,
      touched: {
        ...prev.touched,
        [field]: true
      }
    }));
    
    if (validateOnBlur) {
      validateField(field);
    }
  }, [validateOnBlur, validateField]);

  // Handle form submission
  const handleSubmit = useCallback((e?: React.FormEvent<HTMLFormElement>) => {
    if (e) {
      e.preventDefault();
    }
    
    // Set all fields as touched
    const allTouched = Object.keys(values).reduce((acc, key) => {
      acc[key as keyof T] = true;
      return acc;
    }, {} as Record<keyof T, boolean>);
    
    setFormState(prev => ({
      ...prev,
      touched: allTouched,
      isSubmitting: true
    }));
    
    // Validate the form
    const formErrors = validateFormValues();
    
    if (hasErrors(formErrors)) {
      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        isValid: false
      }));
      return;
    }
    
    // Call onSubmit callback
    if (onSubmit) {
      const helpers: FormHelpers<T> = {
        resetForm,
        setValues,
        setFieldValue,
        setFieldError,
        setErrors,
        validateForm: validateFormValues,
        validateField,
        setSubmitting,
        setTouched,
        setFieldTouched
      };
      
      Promise.resolve(onSubmit(values, helpers))
        .catch(error => {
          console.error('Form submission error:', error);
          setFormState(prev => ({
            ...prev,
            isSubmitting: false
          }));
        });
    } else {
      setFormState(prev => ({
        ...prev,
        isSubmitting: false
      }));
    }
  }, [
    values,
    validateFormValues,
    onSubmit,
    resetForm,
    setValues,
    setFieldValue,
    setFieldError,
    setErrors,
    validateField,
    setSubmitting,
    setTouched,
    setFieldTouched
  ]);

  // Return form state and handlers
  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    setValues,
    setFieldValue,
    setFieldError,
    setErrors,
    validateForm: validateFormValues,
    validateField,
    setSubmitting,
    setTouched,
    setFieldTouched
  };
}