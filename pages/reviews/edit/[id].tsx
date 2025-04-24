// pages/reviews/edit/[id].tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useState, useEffect } from 'react';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../components/AuthProvider';
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
import { 
  FIELD_LIMITS, 
  ALLOWED_IMAGE_TYPES,
  MAX_FILE_SIZES,
  StorageBucket
} from '../../../constants';
import { ReviewWithProfile } from '../../../types/supabase';

/*
 * This is a simplified implementation of the edit review page
 * that avoids complex state management and form libraries to
 * prevent re-rendering loops
 */
const EditReview: NextPage = () => {
  const router = useRouter();
  const { user, loading: authLoading, isAdmin } = useAuth();
  const { id } = router.query;
  
  // Component state
  const [review, setReview] = useState<ReviewWithProfile | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  
  // Form state - managed directly to avoid dependencies
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [accountName, setAccountName] = useState('');
  const [orgId, setOrgId] = useState('');
  const [segment, setSegment] = useState('Enterprise');
  const [remoteAccess, setRemoteAccess] = useState(false);
  const [graphName, setGraphName] = useState('');
  const [useCase, setUseCase] = useState('');
  const [customerFolder, setCustomerFolder] = useState('');
  const [handoffLink, setHandoffLink] = useState('');
  
  // Image state
  const [graphImage, setGraphImage] = useState<File | null>(null);
  const [graphImageUrl, setGraphImageUrl] = useState('');
  const [graphImageError, setGraphImageError] = useState<string | null>(null);
  
  // Form validation state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Load review data on mount
  useEffect(() => {
    // Only run once on mount
    const fetchReview = async () => {
      // Skip if no id, still loading auth, or no user
      if (!id || authLoading || !user) return;
      
      try {
        console.log('Fetching review data for ID:', id);
        setLoading(true);
        
        // Get token for authentication
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        
        if (!token) {
          throw new Error('No authentication token available');
        }
        
        // Fetch the review data via API
        const response = await fetch(`/api/reviews/${id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch review');
        }
        
        const data = await response.json();
        
        if (!data.success || !data.data) {
          throw new Error('Invalid response format');
        }
        
        const reviewData = data.data;
        console.log('Review data loaded successfully');
        
        // Check authorization
        const isAuthor = reviewData.user_id === user.id;
        const userIsAdmin = isAdmin ? isAdmin() : false;
        
        if (!isAuthor && !userIsAdmin) {
          setError('You are not authorized to edit this review');
          setIsAuthorized(false);
        } else {
          setIsAuthorized(true);
        }
        
        // Set the review data - transform from snake_case to camelCase
        const transformedReview = {
          id: reviewData.id,
          title: reviewData.title || '',
          description: reviewData.description || '',
          graphImageUrl: reviewData.graph_image_url || '',
          status: reviewData.status,
          userId: reviewData.user_id,
          createdAt: reviewData.created_at,
          updatedAt: reviewData.updated_at,
          accountName: reviewData.account_name || '',
          orgId: reviewData.org_id || '',
          segment: reviewData.segment || 'Enterprise',
          remoteAccess: reviewData.remote_access || false,
          graphName: reviewData.graph_name || '',
          useCase: reviewData.use_case || '',
          customerFolder: reviewData.customer_folder || '',
          handoffLink: reviewData.handoff_link || '',
          // Mock user data since we don't have it
          user: {
            id: reviewData.user_id,
            name: 'User',
            email: '',
            createdAt: reviewData.created_at,
            role: 'Member'
          }
        };
        
        setReview(transformedReview);
        
        // Set form state
        setTitle(transformedReview.title);
        setDescription(transformedReview.description);
        setAccountName(transformedReview.accountName);
        setOrgId(transformedReview.orgId);
        setSegment(transformedReview.segment);
        setRemoteAccess(transformedReview.remoteAccess);
        setGraphName(transformedReview.graphName);
        setUseCase(transformedReview.useCase);
        setCustomerFolder(transformedReview.customerFolder);
        setHandoffLink(transformedReview.handoffLink);
        
        // Set image URL if it exists
        if (transformedReview.graphImageUrl) {
          setGraphImageUrl(transformedReview.graphImageUrl);
        }
      } catch (err) {
        console.error('Error loading review:', err);
        setError(err instanceof Error ? err.message : 'Failed to load review');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReview();
  }, [id, user, authLoading, isAdmin]);
  
  // Auth redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);
  
  // Handle form validation
  const validate = () => {
    const errors: Record<string, string> = {};
    
    // Title validation
    if (!title.trim()) {
      errors.title = 'Title is required';
    } else if (title.length > FIELD_LIMITS.TITLE_MAX_LENGTH) {
      errors.title = `Title must be no more than ${FIELD_LIMITS.TITLE_MAX_LENGTH} characters`;
    }
    
    // Description validation
    if (!description.trim()) {
      errors.description = 'Description is required';
    } else if (description.length > FIELD_LIMITS.DESCRIPTION_MAX_LENGTH) {
      errors.description = `Description must be no more than ${FIELD_LIMITS.DESCRIPTION_MAX_LENGTH} characters`;
    }
    
    // Account name validation
    if (!accountName.trim()) {
      errors.accountName = 'Account name is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle field blur for validation
  const handleBlur = (field: string) => {
    setTouched({ ...touched, [field]: true });
    validate();
  };
  
  // Handle image change
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!validate()) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      if (!user) {
        throw new Error('You must be logged in to update a review');
      }
      
      if (!review) {
        throw new Error('Review not found');
      }
      
      if (!isAuthorized) {
        throw new Error('You are not authorized to edit this review');
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
        } catch (err) {
          console.error('Error uploading image:', err);
          throw new Error('Failed to upload image. Please try again.');
        }
      } else if (graphImageUrl === '') {
        // User cleared the image
        uploadedImageUrl = ''; // Use empty string instead of null
        console.log('Image cleared');
      }
      
      // Get token for authentication
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      // Update the review via API
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          graphImageUrl: uploadedImageUrl,
          accountName,
          orgId,
          segment,
          remoteAccess,
          graphName,
          useCase,
          customerFolder,
          handoffLink
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update review');
      }
      
      console.log('Review updated successfully');
      
      // Success - redirect to the review page
      router.push(`/reviews/${review.id}`);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      setSubmitting(false);
    }
  };
  
  // Show loading state
  if (loading || authLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
          <span className="ml-4">Loading review data...</span>
        </div>
      </Layout>
    );
  }
  
  // Show error if not authorized
  if (!isAuthorized && !loading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Edit Review</h1>
          <ErrorDisplay 
            error={error || "You do not have permission to edit this review"} 
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
  
  // Render form
  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Edit Review</h1>
        
        {error && (
          <ErrorDisplay 
            error={error} 
            onDismiss={() => setError(null)} 
            variant="error"
            className="mb-6"
          />
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="mb-4">
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title<span className="text-red-600 ml-1">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => handleBlur('title')}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.title && touched.title ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="Enter a descriptive title"
              required
            />
            {formErrors.title && touched.title && (
              <p className="mt-1 text-sm text-red-600">{formErrors.title}</p>
            )}
            {!formErrors.title && (
              <p className="mt-1 text-sm text-gray-500">{`Maximum ${FIELD_LIMITS.TITLE_MAX_LENGTH} characters`}</p>
            )}
          </div>
          
          {/* Account Name */}
          <div className="mb-4">
            <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 mb-1">
              Account Name<span className="text-red-600 ml-1">*</span>
            </label>
            <input
              id="accountName"
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              onBlur={() => handleBlur('accountName')}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.accountName && touched.accountName ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="Enter customer's account name"
              required
            />
            {formErrors.accountName && touched.accountName && (
              <p className="mt-1 text-sm text-red-600">{formErrors.accountName}</p>
            )}
          </div>
          
          {/* OrgID */}
          <div className="mb-4">
            <label htmlFor="orgId" className="block text-sm font-medium text-gray-700 mb-1">
              OrgID
            </label>
            <input
              id="orgId"
              type="text"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter the organization ID"
            />
          </div>
          
          {/* Segment */}
          <div className="mb-4">
            <label htmlFor="segment" className="block text-sm font-medium text-gray-700 mb-1">
              Segment<span className="text-red-600 ml-1">*</span>
            </label>
            <select
              id="segment"
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="Enterprise">Enterprise</option>
              <option value="MidMarket">MidMarket</option>
            </select>
          </div>
          
          {/* Remote Access */}
          <div className="flex items-start mb-4">
            <div className="flex items-center h-5">
              <input
                id="remoteAccess"
                type="checkbox"
                checked={remoteAccess}
                onChange={(e) => setRemoteAccess(e.target.checked)}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="remoteAccess" className="font-medium text-gray-700">
                Remote Access Granted
              </label>
              <p className="text-gray-500">Check if remote access has been granted</p>
            </div>
          </div>
          
          {/* Graph Name */}
          <div className="mb-4">
            <label htmlFor="graphName" className="block text-sm font-medium text-gray-700 mb-1">
              Graph Name
            </label>
            <input
              id="graphName"
              type="text"
              value={graphName}
              onChange={(e) => setGraphName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Lead Router Graph, Contact Router Graph"
            />
          </div>
          
          {/* Description */}
          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description<span className="text-red-600 ml-1">*</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => handleBlur('description')}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                formErrors.description && touched.description ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-blue-500'
              }`}
              placeholder="Provide a detailed description of your graph"
              rows={6}
              required
            />
            {formErrors.description && touched.description && (
              <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
            )}
            {!formErrors.description && (
              <p className="mt-1 text-sm text-gray-500">{`Maximum ${FIELD_LIMITS.DESCRIPTION_MAX_LENGTH} characters`}</p>
            )}
          </div>
          
          {/* Use Case */}
          <div className="mb-4">
            <label htmlFor="useCase" className="block text-sm font-medium text-gray-700 mb-1">
              Use Case
            </label>
            <textarea
              id="useCase"
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the customer's use case or pain points"
              rows={4}
            />
          </div>
          
          {/* Customer Folder */}
          <div className="mb-4">
            <label htmlFor="customerFolder" className="block text-sm font-medium text-gray-700 mb-1">
              Customer Folder
            </label>
            <input
              id="customerFolder"
              type="text"
              value={customerFolder}
              onChange={(e) => setCustomerFolder(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter Google Drive folder URL"
            />
          </div>
          
          {/* Handoff Link */}
          <div className="mb-4">
            <label htmlFor="handoffLink" className="block text-sm font-medium text-gray-700 mb-1">
              Handoff Link
            </label>
            <input
              id="handoffLink"
              type="text"
              value={handoffLink}
              onChange={(e) => setHandoffLink(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter Salesforce handoff record URL"
            />
          </div>
          
          {/* Graph Image */}
          <div className="mb-4">
            <label htmlFor="graphImage" className="block text-sm font-medium text-gray-700 mb-1">
              Graph Image (Optional)
            </label>
            <input
              id="graphImage"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {graphImageError && (
              <p className="mt-1 text-sm text-red-600">{graphImageError}</p>
            )}
            <p className="mt-1 text-sm text-gray-500">
              {`Supported formats: ${ALLOWED_IMAGE_TYPES.map(type => type.split('/')[1].toUpperCase()).join(', ')}. Maximum size: ${MAX_FILE_SIZES.IMAGE / (1024 * 1024)}MB.`}
            </p>
            {graphImageUrl && (
              <div className="mt-2 relative">
                <img 
                  src={graphImageUrl} 
                  alt="File preview" 
                  className="max-h-40 rounded border border-gray-300" 
                />
                <button
                  type="button"
                  onClick={handleClearImage}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"
                  aria-label="Remove file"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          
          {/* Submit buttons */}
          <div className="flex items-center justify-between mt-8">
            <button
              type="button"
              onClick={() => router.push(`/reviews/${id}`)}
              className="text-gray-600 hover:underline"
            >
              Cancel
            </button>
            
            <button
              type="submit"
              disabled={submitting || !!graphImageError}
              className={`px-4 py-2 bg-blue-600 text-white rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {submitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </span>
              ) : 'Update Review'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default EditReview;