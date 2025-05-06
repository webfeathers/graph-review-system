// pages/reviews/new.tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
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
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [graphImage, setGraphImage] = useState<File | null>(null);
  const [graphImageUrl, setGraphImageUrl] = useState<string>('');
  const [graphImageError, setGraphImageError] = useState<string | null>(null);
  const [graphImageTouched, setGraphImageTouched] = useState<boolean>(false);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    // Skip if not authenticated or router isn't ready yet
    if (!user || !router.isReady) return;
    
    // Get query parameters for prefilling
    const { kantataProjectId, title } = router.query;
    
    // Only update if the form exists and parameters are present
    if (kantataProjectId && typeof kantataProjectId === 'string' && 
        form && form.setFieldValue) {
      // Update the Kantata Project ID field without affecting validation state
      form.setFieldValue('kantataProjectId', kantataProjectId);
    }
    
    if (title && typeof title === 'string' && 
        form && form.setFieldValue) {
      // Decode the title and update the field
      form.setFieldValue('title', decodeURIComponent(title));
    }
    
    // Only run this effect when user, router.isReady, or query params change
  }, [user, router.isReady, router.query.kantataProjectId, router.query.title]);

  // Add debugging for auth context
  useEffect(() => {
    console.log('Auth context in NewReview:', {
      user,
      authLoading,
      isAdmin: isAdmin && typeof isAdmin === 'function' ? isAdmin() : null
    });
  }, [user, authLoading, isAdmin]);

  // Update Project Lead ID when user changes
  useEffect(() => {
    if (user && form) {
      console.log('Updating Project Lead ID with user:', user.id);
      form.setFieldValue('projectLeadId', user.id);
    }
  }, [user]);

  // Initialize form with proper typing for user
  const form = useForm<ReviewFormValues>({
    initialValues: {
      title: '',
      description: '',
      accountName: '',
      orgId: '',
      kantataProjectId: '',
      segment: 'Enterprise',
      remoteAccess: false,
      graphName: '',
      useCase: '',
      customerFolder: '',
      handoffLink: '',
      projectLeadId: user?.id || '' // Initialize with current user's ID if available
    },
    validationSchema: {
      title: reviewValidationSchema.title,
      description: reviewValidationSchema.description,
      accountName: reviewValidationSchema.accountName,
      kantataProjectId: reviewValidationSchema.kantataProjectId,
      customerFolder: reviewValidationSchema.customerFolder,
      handoffLink: reviewValidationSchema.handoffLink,
      projectLeadId: reviewValidationSchema.projectLeadId // Add validation for Project Lead
    },
    validateOnChange: false,
    validateOnBlur: true,
    onSubmit: handleSubmit
  });

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

  // Handle form submission
  async function handleSubmit(values: ReviewFormValues) {
    try {
      if (isSubmitting) return; // Prevent double submission
      setIsSubmitting(true);
      setGeneralError(null);

      console.log('Form submission values:', values);

      // Get the current session to ensure we have the latest auth state
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Error getting session:', sessionError);
        throw new Error('Authentication error. Please try again.');
      }

      if (!session?.user) {
        throw new Error('You must be logged in to create a review');
      }

      const currentUserId = session.user.id;
      console.log('Current user ID from session:', currentUserId);

      // Ensure project lead is set
      if (!values.projectLeadId) {
        values.projectLeadId = currentUserId;
      }

      // Check if the project lead exists
      const { data: projectLead, error: projectLeadError } = await supabase
        .from('profiles')
        .select('id, name, email')
        .eq('id', values.projectLeadId)
        .single();

      if (projectLeadError || !projectLead) {
        console.error('Error checking project lead:', projectLeadError);
        throw new Error('Invalid Project Lead selected');
      }

      console.log('Found project lead:', projectLead);

      // Create the review with the validated project lead
      const reviewData = {
        ...values,
        userId: currentUserId,
        status: 'Submitted' as const,
        projectLeadId: projectLead.id,
        segment: values.segment as 'Enterprise' | 'MidMarket'
      };

      const newReview = await createReview(reviewData);
      console.log('Review created successfully:', newReview);

      // Ensure we have a valid review ID before redirecting
      if (!newReview?.id) {
        throw new Error('Failed to create review - no ID returned');
      }

      // Use window.location for a hard redirect
      window.location.href = `/reviews/${newReview.id}`;
    } catch (error: any) {
      console.error('Error creating review:', error);
      setGeneralError(error.message || 'Failed to create review');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  if (!user) return null;

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
              />
            <TextInput
              id="kantataProjectId"
              name="kantataProjectId"
              label="Kantata Project ID"
              placeholder="Enter associated Kantata (Mavenlink) project ID"
              value={form.values.kantataProjectId || ''}
              onChange={form.handleChange('kantataProjectId')}
              onBlur={form.handleBlur('kantataProjectId')}
              error={form.errors.kantataProjectId}
              touched={form.touched.kantataProjectId}
              required
              helpText="Link this review to a Kantata (Mavenlink) project"
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
                isSubmitting={isSubmitting}
                label="Submit Review"
                submittingLabel="Submitting..."
                disabled={isSubmitting}
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

export default NewReview;