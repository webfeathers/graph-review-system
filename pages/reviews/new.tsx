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
  // Note: We handle graphImage separately since we need to track the File object
  // in local state rather than in the form state
}

const NewReview: NextPage = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [graphImage, setGraphImage] = useState<File | null>(null);
  const [graphImageUrl, setGraphImageUrl] = useState<string>('');
  const [graphImageError, setGraphImageError] = useState<string | null>(null);
  const [graphImageTouched, setGraphImageTouched] = useState<boolean>(false);

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
      description: ''
    },
    validationSchema: {
      title: reviewValidationSchema.title,
      description: reviewValidationSchema.description
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
        await createReview({
          title: values.title,
          description: values.description,
          graphImageUrl: uploadedImageUrl,
          status: 'Submitted',
          userId: user.id
        });
        
        // Redirect to reviews list on success
        router.push('/reviews');
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

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Submit a New Graph Review</h1>

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
              onClick={() => router.back()}
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
};

export default NewReview;