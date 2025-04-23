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

interface ReviewFormValues {
  title: string;
  description: string;
  accountName: string;
  orgId: string;
  segment: string; // 'Enterprise' or 'MidMarket'
  remoteAccess: boolean;
  graphName: string;
  useCase: string;
  customerFolder: string;
  handoffLink: string;
}

const NewReview: NextPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);
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

  // Initialize form
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
      // Add validation for new fields if needed
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
      // Clear any previous errors
      setGeneralError(null);

      if (!user) {
        setGeneralError('You must be logged in to submit a review');
        form.setSubmitting(false);
        return;
      }

      let uploadedImageUrl;
      
      // Upload image if provided
      if (graphImage) {
        try {
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
        } catch (error) {
          console.error('Error uploading image:', error);
          setGeneralError('Failed to upload image. Please try again.');
          form.setSubmitting(false);
          return;
        }
      }

      // Create the review using the utility function
      try {
        const result = await createReview({
          title: values.title,
          description: values.description,
          graphImageUrl: uploadedImageUrl,
          status: 'Submitted',
          userId: user.id,
          // New fields
          accountName: values.accountName,
          orgId: values.orgId,
          segment: values.segment as 'Enterprise' | 'MidMarket',
          remoteAccess: values.remoteAccess,
          graphName: values.graphName,
          useCase: values.useCase,
          customerFolder: values.customerFolder,
          handoffLink: values.handoffLink
        });
        
        console.log('Review created successfully:', result);
        
        // Add a small delay to ensure the state is updated before navigation
        setTimeout(() => {
          router.push('/reviews');
        }, 100);
        
      } catch (error) {
        console.error('Error creating review:', error);
        setGeneralError(error instanceof Error ? error.message : 'Failed to create review');
        form.setSubmitting(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setGeneralError('An unexpected error occurred. Please try again.');
      form.setSubmitting(false);
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
                onClick={() => router.push('/reviews')}
                className="text-gray-600 hover:underline"
              >
                Cancel
              </button>
              
              <SubmitButton
                isSubmitting={form.isSubmitting}
                label="Submit Review"
                submittingLabel="Submitting..."
                disabled={form.isSubmitting || !!graphImageError}
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