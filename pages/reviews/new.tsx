// pages/reviews/new.tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useState, useEffect, useMemo, useCallback } from 'react';
import Layout from '../../components/Layout';
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
}

const NewReview: NextPage = () => {
  const { user, loading: authLoading, isAdmin, supabaseClient } = useAuth();
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [graphImage, setGraphImage] = useState<File | null>(null);
  const [graphImageUrl, setGraphImageUrl] = useState<string>('');
  const [graphImageError, setGraphImageError] = useState<string | null>(null);
  const [graphImageTouched, setGraphImageTouched] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  // --- START: Kantata Validation State ---
  const [isValidatingKantata, setIsValidatingKantata] = useState(false);
  const [kantataValidationError, setKantataValidationError] = useState<string | null>(null);
  const [kantataValidationStatus, setKantataValidationStatus] = useState<'idle' | 'valid' | 'invalid' | 'validating'>('idle');
  // --- END: Kantata Validation State ---

  // Memoize initial values
  const initialValues = useMemo(() => ({
    title: '',
    description: '',
    accountName: '',
    orgId: '',
    kantataProjectId: router.query.kantataProjectId as string || '',
    segment: 'Enterprise',
    remoteAccess: false,
    graphName: '',
    useCase: '',
    customerFolder: '',
    handoffLink: '',
    projectLeadId: user?.id || ''
  }), [router.query.kantataProjectId, user?.id]);

  // Memoize the validation schema (excluding Kantata)
  const validationSchema = useMemo(() => ({
    title: reviewValidationSchema.title,
    description: reviewValidationSchema.description,
    accountName: reviewValidationSchema.accountName,
    customerFolder: reviewValidationSchema.customerFolder,
    handoffLink: reviewValidationSchema.handoffLink,
    projectLeadId: reviewValidationSchema.projectLeadId
  }), []);

  // --- Define Handlers BEFORE useForm ---

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

  // Submit Handler (receives values from useForm)
  const handleSubmit = useCallback(async (values: ReviewFormValues) => {
    // Check submission/validation status first
    if (isSubmitting || isValidatingKantata) return;
    setIsSubmitting(true);
    setGeneralError(null);
    setKantataValidationError(null);

    console.log('Form submission values:', values);

    // <<< Check if supabaseClient is available before proceeding >>>
    if (!supabaseClient) {
      console.error("Supabase client not available during submit.");
      setGeneralError("Authentication client error. Please try refreshing.");
      setIsSubmitting(false);
      return;
    }

    // Trigger Kantata Validation on Submit
    if (values.kantataProjectId) {
      const validationResult = await handleKantataValidation(values.kantataProjectId);
      if (!validationResult.isValid) {
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
      
      const reviewData = {
        ...values,
        userId: user!.id, // Use user from useAuth context directly
        status: 'Submitted' as const,
        projectLeadId: projectLead.id, 
        segment: values.segment as 'Enterprise' | 'MidMarket'
      };

      // <<< Pass the supabaseClient from context to createReview >>>
      const newReview = await createReview(reviewData, supabaseClient);
      if (!newReview?.id) {
        throw new Error('Failed to create review - no ID returned');
      }
      router.push(`/reviews/${newReview.id}`);

    } catch (error: any) {
      console.error('Error creating review:', error);
      setGeneralError(error.message || 'Failed to create review');
    } finally {
      setIsSubmitting(false);
    }
  // <<< Add supabaseClient to dependency array >>>
  }, [isSubmitting, isValidatingKantata, router, handleKantataValidation, supabaseClient, user]); 

  // --- Initialize useForm AFTER handlers are defined ---
  const form = useForm<ReviewFormValues>({
    initialValues,
    validationSchema: {}, // Bypass internal validation for schema fields
    validateOnChange: false,
    validateOnBlur: true,
    onSubmit: handleSubmit, // Pass the handler directly
  });

  // --- Effects ---

  // Validate Kantata on Blur
  useEffect(() => {
    const kantataInput = document.querySelector('input[name="kantataProjectId"]');
    if (!kantataInput) return;

    const handleBlur = () => {
      // Only validate if the field has been touched
      if (form.touched.kantataProjectId) {
          handleKantataValidation(form.values.kantataProjectId);
      }
    };

    kantataInput.addEventListener('blur', handleBlur);
    return () => {
      kantataInput.removeEventListener('blur', handleBlur);
    };
  // Dependencies: form values/touched state and the stable validation function
  }, [form.touched.kantataProjectId, form.values.kantataProjectId, handleKantataValidation]);

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
      // Optionally trigger validation if populated from query
      // handleKantataValidation(kantataProjectId); 
    }
  }, [router.isReady, router.query, form.setFieldValue]); // Add router.query and form.setFieldValue

  // Handle image change
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGraphImageTouched(true);
    setGraphImageError(null);
    
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file type
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        setGraphImageError(`File must be a valid image (${ALLOWED_IMAGE_TYPES.map(type => type.split('/')[1].toUpperCase()).join(', ')})`);
        return;
      }
      
      // Validate file size
      if (file.size > MAX_FILE_SIZES.IMAGE) {
        setGraphImageError(`File size must be less than ${MAX_FILE_SIZES.IMAGE / (1024 * 1024)}MB`);
        return;
      }
      
      setGraphImage(file);
      setGraphImageUrl(URL.createObjectURL(file));
    } else {
      setGraphImage(null);
      setGraphImageUrl('');
    }
  };

  // Clear image
  const handleClearImage = () => {
    setGraphImage(null);
    setGraphImageUrl('');
    setGraphImageError(null);
  };

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
      <Layout>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Submit a New Graph Review</h1>
  
          {renderError && (
            <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
              <p>Error rendering form: {renderError}</p>
            </div>
          )}
  
          {generalError && (
            <ErrorDisplay 
              error={generalError} 
              onDismiss={() => setGeneralError(null)} 
              variant="error"
              className="mb-6"
            />
          )}
  
          <Form onSubmit={form.handleSubmit}>

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
              id="accountName"
              name="accountName"
              label="Account Name"
              placeholder="Enter customer's account name"
              value={form.values.accountName}
              onChange={form.handleChange('accountName')}
              onBlur={form.handleBlur('accountName')}
              error={form.errors.accountName}
              touched={form.touched.accountName}
              required
              maxLength={FIELD_LIMITS.ACCOUNT_NAME_MAX_LENGTH}
            />
            <TextInput
              id="kantataProjectId"
              name="kantataProjectId"
              label="Kantata Project ID (Optional)"
              placeholder="Enter associated Kantata (Mavenlink) project ID"
              value={form.values.kantataProjectId || ''}
              onChange={form.handleChange('kantataProjectId')}
              onBlur={form.handleBlur('kantataProjectId')}
              error={form.errors.kantataProjectId}
              touched={form.touched.kantataProjectId}
              maxLength={FIELD_LIMITS.KANTATA_PROJECT_ID_MAX_LENGTH}
              helpText="Link this review to a Kantata (Mavenlink) project"
              className={
                kantataValidationStatus === 'validating' ? 'border-yellow-500' : 
                kantataValidationStatus === 'invalid' ? 'border-red-500' : 
                kantataValidationStatus === 'valid' ? 'border-green-500' : ''
              }
            />

            <TextInput
              id="orgId"
              name="orgId"
              label="OrgID"
              placeholder="Enter the organization ID"
              value={form.values.orgId}
              onChange={form.handleChange('orgId')}
              onBlur={form.handleBlur('orgId')}
              error={form.errors.orgId}
              touched={form.touched.orgId}
              maxLength={FIELD_LIMITS.ORG_ID_MAX_LENGTH}
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
                { value: 'Enterprise', label: 'Enterprise' },
                { value: 'MidMarket', label: 'MidMarket' }
              ]}
              required
            />
  
            <Checkbox
              id="remoteAccess"
              label="Remote Access Granted"
              checked={form.values.remoteAccess}
              onChange={form.handleChange('remoteAccess')}
              helpText="Check if remote access has been granted"
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
              required
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
  
            <FileInput
              id="graphImage"
              name="graphImage"
              label="Graph Image (Optional)"
              accept="image/*"
              onChange={handleImageChange}
              error={graphImageError}
              touched={graphImageTouched}
              preview={graphImageUrl}
              onClearFile={handleClearImage}
              helpText={`Supported formats: ${ALLOWED_IMAGE_TYPES.map(type => type.split('/')[1].toUpperCase()).join(', ')}. Maximum size: ${MAX_FILE_SIZES.IMAGE / (1024 * 1024)}MB.`}
            />
  
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
                label="Submit Review"
                submittingLabel="Submitting..."
                disabled={buttonShouldBeDisabled}
                className="mt-6"
              />
            </div>
          </Form>
        </div>
      </Layout>
    );
  } catch (error) {
    console.error('Error rendering NewReview component:', error);
    setRenderError(error instanceof Error ? error.message : 'An unknown error occurred');
    return (
      <Layout>
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
          <p>Error rendering form: {renderError}</p>
          <button 
            onClick={() => router.push('/reviews')} 
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
          >
            Return to Reviews
          </button>
        </div>
      </Layout>
    );
  }
};

// Export the component wrapped with role protection
// Allow both regular members and admins to create reviews
export default withRoleProtection(NewReview, ['Member', 'Admin']);