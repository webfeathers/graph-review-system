// pages/reviews/edit/[id].tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../components/AuthProvider';
import { useForm } from '../../../lib/useForm';
import { ErrorDisplay } from '../../../components/ErrorDisplay';
import { supabase } from '../../../lib/supabase';
import { 
  Form, 
  TextInput, 
  TextArea, 
  FileInput,
  SelectInput,
  Checkbox,
  SubmitButton 
} from '../../../components/form/FormComponents';
import { reviewValidationSchema } from '../../../lib/validationSchemas';
import { 
  FIELD_LIMITS, 
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZES,
  StorageBucket
} from '../../../constants';
import { getReviewById } from '../../../lib/supabaseUtils';
import { ReviewWithProfile } from '../../../types/supabase';

interface ReviewFormValues {
  title: string;
  description: string;
  accountName: string;
  orgId: string;
  segment: string;
  remoteAccess: boolean;
  graphName: string;
  useCase: string;
  customerFolder: string;
  handoffLink: string;
}

const EditReview: NextPage = () => {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  
  const [review, setReview] = useState<ReviewWithProfile | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [graphImage, setGraphImage] = useState<File | null>(null);
  const [graphImageUrl, setGraphImageUrl] = useState<string>('');
  const [graphImageError, setGraphImageError] = useState<string | null>(null);
  const [graphImageTouched, setGraphImageTouched] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  // Debug logging with render counter
  const renderCountRef = React.useRef(0);
  renderCountRef.current += 1;
  
  console.log(`Rendering EditReview component (#${renderCountRef.current})`, { 
    loading, 
    authLoading, 
    formInitialized,
    isAuthorized,
    reviewId: id,
    hasReview: !!review,
    userExists: !!user
  });

  // Memoize the submit handler to prevent recreating it on every render
  const handleSubmitCallback = useCallback(async (values: ReviewFormValues) => {
    await handleSubmit(values);
  }, [handleSubmit]);
  
  // Initialize form with empty values first
  const form = useForm<ReviewFormValues>({
    initialValues: {
      title: '',
      description: '',
      accountName: '',
      orgId: '',
      segment: 'Enterprise',
      remoteAccess: false,
      graphName: '',
      useCase: '',
      customerFolder: '',
      handoffLink: ''
    },
    validationSchema: {
      title: reviewValidationSchema.title,
      description: reviewValidationSchema.description,
    },
    validateOnChange: false,
    validateOnBlur: true,
    onSubmit: handleSubmitCallback
  });

  // Load review data and set up form - with memoized callback to prevent re-renders
  useEffect(() => {
    // Skip if still loading auth or no user
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!id) return;
    if (formInitialized) return; // Skip if already initialized
    
    console.log('Starting review data load for ID:', id);
    
    // Define an immediately-invoked async function
    (async () => {
      try {
        setLoading(true);
        console.log('Fetching review with ID:', id);
        
        const reviewData = await getReviewById(id as string);
        console.log('Review data loaded successfully');
        
        // Set the review state
        setReview(reviewData);
        
        // Set the form values
        form.setValues({
          title: reviewData.title || '',
          description: reviewData.description || '',
          accountName: reviewData.accountName || '',
          orgId: reviewData.orgId || '',
          segment: reviewData.segment || 'Enterprise',
          remoteAccess: reviewData.remoteAccess || false,
          graphName: reviewData.graphName || '',
          useCase: reviewData.useCase || '',
          customerFolder: reviewData.customerFolder || '',
          handoffLink: reviewData.handoffLink || ''
        });
        
        // Set image URL if it exists
        if (reviewData.graphImageUrl) {
          setGraphImageUrl(reviewData.graphImageUrl);
        }
        
        // Check authorization
        const isAuthor = reviewData.userId === user.id;
        const userIsAdmin = isAdmin ? isAdmin() : false;
        const authorized = isAuthor || userIsAdmin;
        console.log('Auth check:', { isAuthor, isAdmin: userIsAdmin, authorized });
        
        setIsAuthorized(authorized);
        
        if (!authorized) {
          setGeneralError('You are not authorized to edit this review');
        }
        
        // Mark as initialized - this prevents further calls
        setFormInitialized(true);
      } catch (error) {
        console.error('Error loading review:', error);
        setGeneralError('Failed to load review');
      } finally {
        setLoading(false);
      }
    })();
    
    // This effect only runs when these dependencies change
    // Adding formInitialized will prevent re-runs after initial load
  }, [id, user, authLoading, router, isAdmin, formInitialized]);

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
      // Don't clear if user cancels file selection
      if (e.target.value === '') return;
      
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
      console.log('Form submission started with values:', values);
      // Clear any previous errors
      setGeneralError(null);

      if (!user) {
        setGeneralError('You must be logged in to update a review');
        form.setSubmitting(false);
        return;
      }

      if (!review) {
        setGeneralError('Review not found');
        form.setSubmitting(false);
        return;
      }

      if (!isAuthorized) {
        setGeneralError('You are not authorized to edit this review');
        form.setSubmitting(false);
        return;
      }

      let uploadedImageUrl = review.graphImageUrl;
      
      // Upload new image if provided
      if (graphImage) {
        try {
          console.log('Uploading new image');
          // Create a unique filename
          const timestamp = Date.now();
          const safeFileName = graphImage.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const filename = `${timestamp}_${safeFileName}`;
          
          // Upload to Supabase storage
          const { data, error } = await supabase.storage
            .from(StorageBucket.GRAPH_IMAGES)
            .upload(filename, graphImage);
          
          if (error) {
            throw error;
          }
          
          // Get the public URL
          const { data: urlData } = supabase.storage
            .from(StorageBucket.GRAPH_IMAGES)
            .getPublicUrl(data.path);
          
          uploadedImageUrl = urlData.publicUrl;
          console.log('Image uploaded successfully:', uploadedImageUrl);
        } catch (error) {
          console.error('Error uploading image:', error);
          setGeneralError('Failed to upload image. Please try again.');
          form.setSubmitting(false);
          return;
        }
      } else if (graphImageUrl === '') {
        // User cleared the image
        uploadedImageUrl = ''; // Use empty string instead of null
        console.log('Image cleared');
      }

      // Get token for authentication
      console.log('Getting authentication token');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Update the review via API
      try {
        console.log('Sending update request to API');
        const response = await fetch(`/api/reviews/${review.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: values.title,
            description: values.description,
            graphImageUrl: uploadedImageUrl,
            accountName: values.accountName,
            orgId: values.orgId,
            segment: values.segment,
            remoteAccess: values.remoteAccess,
            graphName: values.graphName,
            useCase: values.useCase,
            customerFolder: values.customerFolder,
            handoffLink: values.handoffLink
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update review');
        }
        
        console.log('Review updated successfully');
        // Success - redirect to the review page
        router.push(`/reviews/${review.id}`);
        
      } catch (error) {
        console.error('Error updating review:', error);
        setGeneralError(error instanceof Error ? error.message : 'Failed to update review');
        form.setSubmitting(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setGeneralError('An unexpected error occurred. Please try again.');
      form.setSubmitting(false);
    }
  }

  // Already handled by our comprehensive loading check above
  
  // This should only run if we have a user and review but not authorized
  if (!isAuthorized && user && review) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Edit Review</h1>
          <ErrorDisplay 
            error="You do not have permission to edit this review" 
            variant="error"
            className="mb-6"
          />
          <div className="flex justify-center">
            <button
              onClick={() => router.push(`/reviews/${id}`)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Back to Review
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Already handled above

  // Show loading state if any of these conditions are true
  if (authLoading || loading || !formInitialized || !review) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="ml-4">
            {authLoading ? 'Checking authentication...' : 
             loading ? 'Loading review data...' : 
             !formInitialized ? 'Preparing form...' : 
             !review ? 'Waiting for review data...' : 'Loading...'}
          </span>
        </div>
        <div className="mt-4 text-center text-gray-500">
          Debug: authLoading={String(authLoading)}, loading={String(loading)},<br/>
          formInitialized={String(formInitialized)}, hasReview={String(!!review)}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Edit Review</h1>

        {generalError && (
          <ErrorDisplay 
            error={generalError} 
            onDismiss={() => setGeneralError(null)} 
            variant="error"
            className="mb-6"
          />
        )}

        <Form onSubmit={form.handleSubmit}>
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
              onClick={() => router.push(`/reviews/${id}`)}
              className="text-gray-600 hover:underline"
            >
              Cancel
            </button>
            
            <SubmitButton
              isSubmitting={form.isSubmitting}
              label="Update Review"
              submittingLabel="Updating..."
              disabled={form.isSubmitting || !!graphImageError}
            />
          </div>
        </Form>
      </div>
    </Layout>
  );
};

export default EditReview;