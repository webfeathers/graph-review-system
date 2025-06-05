// pages/reviews/new.tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../../components/AuthProvider';
import { useForm } from '../../lib/useForm';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { supabase } from '../../lib/supabase';
import { 
  Form, 
  TextInput, 
  TextArea, 
  FileInput,
  SelectInput,
  Checkbox,
  SubmitButton 
} from '../../components/form/FormComponents';
import { reviewValidationSchema } from '../../lib/validationSchemas';
import { 
  FIELD_LIMITS, 
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZES,
  StorageBucket
} from '../../constants';
import { createReview } from '../../lib/supabaseUtils';
import ProjectLeadSelector from '../../components/ProjectLeadSelector';
import { withRoleProtection } from '../../components/withRoleProtection';
import React from 'react';
import { createValidator, required, minLength, maxLength, validateForm, url } from '../../lib/validationUtils';

interface ReviewFormValues {
  title: string;
  description: string;
  accountName: string;
  kantataProjectId?: string;
  orgId: string;
  segment: string; // 'Enterprise' or 'MidMarket'
  remoteAccess: boolean;
  graphName: string;
  useCase: string;
  customerFolder: string;
  handoffLink: string;
  projectLeadId: string;
  status: string;
  reviewType: 'customer' | 'template';
  fileLink?: string;
}

const NewReview: NextPage = () => {
  const { user, loading: authLoading, isAdmin, supabaseClient } = useAuth();
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  // --- START: Kantata Validation State ---
  const [isValidatingKantata, setIsValidatingKantata] = useState(false);
  const [kantataValidationError, setKantataValidationError] = useState<string | null>(null);
  const [kantataValidationStatus, setKantataValidationStatus] = useState<'idle' | 'valid' | 'invalid' | 'validating'>('idle');
  // --- END: Kantata Validation State ---

  // Add state for uploaded file and file URL
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateFileUrl, setTemplateFileUrl] = useState<string>('');

  // Memoize initial values
  const initialValues: ReviewFormValues = {
    title: '',
    description: '',
    accountName: '',
    orgId: '',
    kantataProjectId: router.query.kantataProjectId as string || '',
    segment: '',
    remoteAccess: false,
    graphName: '',
    useCase: '',
    customerFolder: '',
    handoffLink: '',
    projectLeadId: router.query.projectLeadId as string || user?.id || '',
    status: 'Draft',
    reviewType: 'customer',
    fileLink: '',
  };

  // Memoize the validation schema (excluding Kantata)
  const [validationSchema, setValidationSchema] = useState({});

  // Remove the dropdown and add two buttons for review type selection
  const [selectedType, setSelectedType] = useState<'customer' | 'template' | null>(null);

  // --- Initialize useForm BEFORE handlers are defined ---
  const form = useForm<ReviewFormValues>({
    initialValues,
    validationSchema,
    validateOnChange: true,
    validateOnBlur: true,
    onSubmit: async (values) => {
      // Check submission/validation status first
      if (isSubmitting || isValidatingKantata) return;

      // Mark all fields as touched to show validation errors
      const touchedFields = Object.keys(values).reduce((acc, key) => {
        acc[key as keyof ReviewFormValues] = true;
        return acc;
      }, {} as Record<keyof ReviewFormValues, boolean>);
      form.setTouched(touchedFields);

      // Validate form
      const errors = validateForm(values, validationSchema);
      if (Object.keys(errors).length > 0) {
        form.setErrors(errors);
        setGeneralError('Please fill in all required fields');
        // Scroll to top immediately when validation fails
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      setIsSubmitting(true);
      setGeneralError(null);
      setKantataValidationError(null);

      console.log('Form submission values:', values);

      // <<< Check if supabaseClient is available before proceeding >>>
      if (!supabaseClient) {
        console.error("Supabase client not available during submit.");
        setGeneralError("Authentication client error. Please try refreshing.");
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setIsSubmitting(false);
        return;
      }

      // Trigger Kantata Validation on Submit
      if (values.kantataProjectId) {
        const validationResult = await handleKantataValidation(values.kantataProjectId);
        if (!validationResult.isValid) {
          setGeneralError(validationResult.message);
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setIsSubmitting(false); // Stop submission
          return;
        }
      }

      // Proceed with review creation logic...
      try {
        const { data: projectLead, error: projectLeadError } = await supabase
          .from('profiles')
          .select('id') // Only need ID
          .eq('id', values.projectLeadId || user!.id) // Use user ID if lead not set
          .single();

        if (projectLeadError || !projectLead) {
          throw new Error('Invalid Project Lead selected or not found');
        }
        
        let uploadedFileUrl = '';
        if (values.reviewType === 'template') {
          if (!templateFile) {
            setGeneralError('Please upload a .txt file for the template.');
            setIsSubmitting(false);
            return;
          }
          const sanitizedFileName = sanitizeFileName(templateFile.name);
          const filePath = `templates/${user!.id}/${Date.now()}_${sanitizedFileName}`;
          const { data, error } = await supabase.storage.from('template-files').upload(filePath, templateFile);
          if (error) {
            setGeneralError('Failed to upload file: ' + error.message);
            setIsSubmitting(false);
            return;
          }
          const { data: publicUrlData } = supabase.storage.from('template-files').getPublicUrl(filePath);
          uploadedFileUrl = publicUrlData?.publicUrl || '';
          setTemplateFileUrl(uploadedFileUrl);
        }
        
        const reviewPayload = {
          ...values,
          userId: user!.id,
          status: (values.status || 'Draft') as 'Draft' | 'Submitted' | 'In Review' | 'Needs Work' | 'Approved',
          projectLeadId: projectLead.id,
          segment: values.segment as 'Enterprise' | 'MidMarket',
          reviewType: values.reviewType,
          fileLink: uploadedFileUrl || undefined,
        };

        // Use the API route for review creation with Supabase Auth token
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const response = await fetch('/api/reviews', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
          },
          body: JSON.stringify(reviewPayload),
        });
        const result = await response.json();
        if (result.success) {
          window.location.href = `/reviews/${result.data.id}?success=true&message=${encodeURIComponent('Review created successfully')}`;
        } else {
          setGeneralError(result.message || 'Failed to create review');
        }
      } catch (error: any) {
        console.error('Error creating review:', error);
        setGeneralError(error.message || 'Failed to create review');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  useEffect(() => {
    if (form.values.reviewType === 'template') {
      setValidationSchema({
        title: reviewValidationSchema.title,
        description: createValidator(),
        graphName: createValidator(),
        projectLeadId: reviewValidationSchema.projectLeadId,
      });
    } else {
      setValidationSchema({
        title: reviewValidationSchema.title,
        description: createValidator(),
        accountName: createValidator(
          required('Account Name is required')
        ),
        customerFolder: reviewValidationSchema.customerFolder,
        handoffLink: reviewValidationSchema.handoffLink,
        projectLeadId: reviewValidationSchema.projectLeadId,
        kantataProjectId: reviewValidationSchema.kantataProjectId,
        graphName: createValidator(),
        segment: createValidator(
          required('Please select a customer segment')
        ),
        orgId: createValidator(
          required('Organization ID is required')
        ),
        useCase: createValidator(
          (value: string) => {
            if (!value) return null;
            return value.length >= 10 ? null : 'Use case must be at least 10 characters if provided';
          }
        )
      });
    }
  }, [form.values.reviewType]);

  // Handle form validation
  const validate = useCallback(() => {
    const values = {
      title: form.values.title,
      description: form.values.description,
      accountName: form.values.accountName,
      orgId: form.values.orgId,
      segment: form.values.segment,
      graphName: form.values.graphName,
      useCase: form.values.useCase,
      customerFolder: form.values.customerFolder,
      handoffLink: form.values.handoffLink,
      kantataProjectId: form.values.kantataProjectId,
      projectLeadId: form.values.projectLeadId
    };
    
    const errors = validateForm(values, validationSchema);
    
    // Only set errors for fields that have been touched or when submitting
    const filteredErrors = Object.entries(errors).reduce((acc, [key, value]) => {
      const fieldKey = key as keyof ReviewFormValues;
      if (form.touched[fieldKey] || isSubmitting) {
        acc[fieldKey] = value;
      }
      return acc;
    }, {} as Record<keyof ReviewFormValues, string>);
    
    form.setErrors(filteredErrors);
    
    // Only set general error if we're submitting or if fields have been touched
    if (isSubmitting || Object.keys(form.touched).length > 0) {
      if (Object.keys(filteredErrors).length > 0) {
        setGeneralError('Please fill in all required fields');
      } else {
        setGeneralError(null);
      }
    }
    
    return Object.keys(filteredErrors).length === 0;
  }, [form.values, form.setErrors, validationSchema, form.touched, isSubmitting]);

  // Add effect to validate form when values change
  useEffect(() => {
    validate();
  }, [form.values, validate]);

  // Add effect to scroll to top when any error changes
  useEffect(() => {
    // Only scroll on submit or when errors are explicitly shown
    if (isSubmitting && (generalError || kantataValidationError || Object.keys(form.errors).length > 0)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [generalError, kantataValidationError, form.errors, isSubmitting]);

  // Add effect to scroll to the first field with an error
  useEffect(() => {
    // Only scroll on submit or when errors are explicitly shown
    if (isSubmitting && Object.keys(form.errors).length > 0) {
      const firstErrorField = document.querySelector('[data-error="true"]');
      if (firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [form.errors, isSubmitting]);

  // Kantata Validation Function
  const handleKantataValidation = useCallback(async (kantataProjectId: string | undefined): Promise<{isValid: boolean; message: string}> => {
    if (!kantataProjectId) {
      setKantataValidationError(null);
      setKantataValidationStatus('idle');
      return { isValid: true, message: '' };
    }
    setIsValidatingKantata(true);
    setKantataValidationError(null);
    setKantataValidationStatus('validating');
    
    try {
      // Get the current session/token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error("Error getting session for validation:", sessionError);
        throw new Error('Authentication session error.');
      }
      
      const token = session.access_token;

      const response = await fetch('/api/kantata/validate-project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // Add the Authorization header
        },
        body: JSON.stringify({ kantataProjectId }),
      });
      const result = await response.json();
      if (!response.ok) {
        setKantataValidationError(result.message || 'Validation failed');
        setKantataValidationStatus('invalid');
        return { isValid: false, message: result.message };
      } else {
        setKantataValidationError(null);
        setKantataValidationStatus('valid');
        // Cannot auto-populate title here easily without form access
        return { isValid: true, message: result.message };
      }
    } catch (error) {
      console.error('Kantata validation API call failed:', error);
      const message = error instanceof Error ? error.message : 'Network error during validation';
      setKantataValidationError(message);
      setKantataValidationStatus('invalid');
      return { isValid: false, message };
    } finally {
      setIsValidatingKantata(false);
    }
  }, []); // No other dependencies needed

  // Handle URL parameters
  useEffect(() => {
    if (!router.isReady) return;
    const { title, kantataProjectId } = router.query;
    if (title && typeof title === 'string') {
      form.setFieldValue('title', decodeURIComponent(title));
    }
    // Also set Kantata ID from query param if present
    if (kantataProjectId && typeof kantataProjectId === 'string') {
      form.setFieldValue('kantataProjectId', kantataProjectId);
    }
  }, [router.isReady, router.query, form.setFieldValue]);

  // Add a function to sanitize file names for Supabase Storage
  function sanitizeFileName(name: string) {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) return null;

  // Disable submit button logic
  const buttonShouldBeDisabled = 
    isSubmitting || 
    isValidatingKantata ||
    kantataValidationStatus === 'invalid' || 
    !supabaseClient || // <<< Disable submit if client isn't ready >>>
    Object.keys(form.errors).length > 0;

  try {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">New Graph Review</h1>
          
          {/* Error Display */}
          {(generalError || kantataValidationError) && (
            <div className="mb-6">
              <ErrorDisplay 
                error={generalError || kantataValidationError || ''} 
                onDismiss={() => {
                  setGeneralError(null);
                  setKantataValidationError(null);
                }}
              />
            </div>
          )}

          <Form 
            key={formKey} 
            onSubmit={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setFormKey(prev => prev + 1);
              form.handleSubmit(e);
            }}
          >
            <div className="mb-6 flex gap-4">
              <button
                type="button"
                className={`px-4 py-2 rounded border font-semibold ${selectedType === 'customer' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'}`}
                onClick={() => {
                  setSelectedType('customer');
                  form.setFieldValue('reviewType', 'customer');
                }}
              >
                Customer Graph Review
              </button>
              <button
                type="button"
                className={`px-4 py-2 rounded border font-semibold ${selectedType === 'template' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-blue-600 border-blue-600 hover:bg-blue-50'}`}
                onClick={() => {
                  setSelectedType('template');
                  form.setFieldValue('reviewType', 'template');
                }}
              >
                Template/Snippet Review
              </button>
            </div>

            {/* Only show the form fields after a type is selected */}
            {selectedType && (
              <>
                {/* Conditionally render fields based on reviewType */}
                {selectedType === 'customer' && (
                  <>
                    <TextInput
                      id="accountName"
                      name="accountName"
                      label="Account Name"
                      placeholder="Enter customer's account name"
                      value={form.values.accountName}
                      onChange={form.handleChange('accountName')}
                      onBlur={form.handleBlur('accountName')}
                      error={form.errors.accountName}
                      touched={form.touched.accountName}
                      maxLength={FIELD_LIMITS.ACCOUNT_NAME_MAX_LENGTH}
                    />
                    <TextInput
                      id="orgId"
                      name="orgId"
                      label="Organization ID"
                      placeholder="Enter organization ID"
                      value={form.values.orgId}
                      onChange={form.handleChange('orgId')}
                      onBlur={form.handleBlur('orgId')}
                      error={form.errors.orgId}
                      touched={form.touched.orgId}
                      required
                    />
                    <TextInput
                      id="kantataProjectId"
                      name="kantataProjectId"
                      label="Kantata Project ID"
                      placeholder="Enter Kantata Project ID"
                      value={form.values.kantataProjectId}
                      onChange={form.handleChange('kantataProjectId')}
                      onBlur={form.handleBlur('kantataProjectId')}
                      error={form.errors.kantataProjectId}
                      touched={form.touched.kantataProjectId}
                      required
                    />
                    <SelectInput
                      id="segment"
                      name="segment"
                      label="Segment"
                      value={form.values.segment}
                      onChange={form.handleChange('segment')}
                      onBlur={form.handleBlur('segment')}
                      error={form.errors.segment}
                      touched={form.touched.segment}
                      options={[
                        { value: '', label: 'Please Select' },
                        { value: 'MidMarket', label: 'MidMarket' },
                        { value: 'Enterprise', label: 'Enterprise' }
                      ]}
                      required
                      helpText="Select the customer segment"
                    />
                    <TextInput
                      id="customerFolder"
                      name="customerFolder"
                      label="Customer Folder"
                      placeholder="Enter Google Drive folder URL"
                      value={form.values.customerFolder}
                      onChange={form.handleChange('customerFolder')}
                      onBlur={form.handleBlur('customerFolder')}
                      error={form.errors.customerFolder}
                      touched={form.touched.customerFolder}
                      maxLength={FIELD_LIMITS.CUSTOMER_FOLDER_MAX_LENGTH}
                      type="url"
                    />
                    <TextInput
                      id="handoffLink"
                      name="handoffLink"
                      label="Handoff Link"
                      placeholder="Enter Salesforce handoff record URL"
                      value={form.values.handoffLink}
                      onChange={form.handleChange('handoffLink')}
                      onBlur={form.handleBlur('handoffLink')}
                      error={form.errors.handoffLink}
                      touched={form.touched.handoffLink}
                      maxLength={FIELD_LIMITS.HANDOFF_LINK_MAX_LENGTH}
                      type="url"
                    />
                  </>
                )}
                {selectedType === 'template' && (
                  <div className="mb-4">
                    <label htmlFor="templateFile" className="block text-sm font-medium text-gray-700 mb-1">
                      Upload Template File (.txt)
                    </label>
                    <input
                      id="templateFile"
                      name="templateFile"
                      type="file"
                      accept=".txt"
                      onChange={e => {
                        const file = e.target.files && e.target.files[0];
                        setTemplateFile(file || null);
                      }}
                      className="block w-full text-sm text-gray-700 border border-gray-300 rounded-md"
                    />
                    {templateFile && <p className="mt-1 text-sm text-gray-500">Selected: {templateFile.name}</p>}
                  </div>
                )}
                <div className="mb-4">
                  <label htmlFor="projectLeadId" className="block text-sm font-medium text-gray-700 mb-1">
                    Project Lead
                  </label>
                  <ProjectLeadSelector
                    value={form.values.projectLeadId}
                    onChange={(value) => form.setFieldValue('projectLeadId', value)}
                    disabled={!(isAdmin && typeof isAdmin === 'function' && isAdmin()) && user?.id !== form.values.projectLeadId}
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    The person responsible for this graph review.
                    {!(isAdmin && typeof isAdmin === 'function' && isAdmin()) && " Only admins can assign to someone else."}
                  </p>
                </div>

                <TextInput
                  id="title"
                  name="title"
                  label="Title"
                  placeholder="Enter a descriptive title"
                  value={form.values.title}
                  onChange={form.handleChange('title')}
                  onBlur={form.handleBlur('title')}
                  error={form.errors.title}
                  touched={form.touched.title}
                  required
                  helpText={`Maximum ${FIELD_LIMITS.TITLE_MAX_LENGTH} characters`}
                />
        
                <TextInput
                  id="graphName"
                  name="graphName"
                  label="Graph Name"
                  placeholder="e.g., Lead Router Graph, Contact Router Graph"
                  value={form.values.graphName}
                  onChange={form.handleChange('graphName')}
                  onBlur={form.handleBlur('graphName')}
                  error={form.errors.graphName}
                  touched={form.touched.graphName}
                  maxLength={FIELD_LIMITS.GRAPH_NAME_MAX_LENGTH}
                  required
                  helpText="A descriptive name to help identify the specific graph in the customer's organization"
                />
        
                <TextArea
                  id="description"
                  name="description"
                  label="Description"
                  placeholder="Provide a detailed description of your graph"
                  value={form.values.description}
                  onChange={form.handleChange('description')}
                  onBlur={form.handleBlur('description')}
                  error={form.errors.description}
                  touched={form.touched.description}
                  rows={6}
                  helpText={`Maximum ${FIELD_LIMITS.DESCRIPTION_MAX_LENGTH} characters`}
                />
        
                <TextArea
                  id="useCase"
                  name="useCase"
                  label="Use Case"
                  placeholder="Describe the customer's use case or pain points"
                  value={form.values.useCase}
                  onChange={form.handleChange('useCase')}
                  onBlur={form.handleBlur('useCase')}
                  error={form.errors.useCase}
                  touched={form.touched.useCase}
                  rows={4}
                  maxLength={FIELD_LIMITS.USE_CASE_MAX_LENGTH}
                />
              </>
            )}
            <div className="flex items-center justify-between mt-8">
              <button
                type="button"
                onClick={() => router.push('/reviews')}
                className="text-gray-600 hover:underline"
              >
                Cancel
              </button>
              
              <SubmitButton
                isSubmitting={isSubmitting || isValidatingKantata}
                label="Submit Draft"
                submittingLabel="Submitting..."
                disabled={buttonShouldBeDisabled}
                className="mt-6"
                onClick={() => {
                  // Force scroll to top when submit button is clicked
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </div>
          </Form>
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error rendering NewReview component:', error);
    setRenderError(error instanceof Error ? error.message : 'An unknown error occurred');
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
        <p>Error rendering form: {renderError}</p>
        <button 
          onClick={() => router.push('/reviews')} 
          className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Return to Reviews
        </button>
      </div>
    );
  }
};

// Export the component wrapped with role protection
// Allow both regular members and admins to create reviews
export default withRoleProtection(NewReview, ['Member', 'Admin']);