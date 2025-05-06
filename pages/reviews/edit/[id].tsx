// pages/reviews/edit/[id].tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../../components/Layout';
import { useAuth } from '../../../components/AuthProvider';
import { ErrorDisplay } from '../../../components/ErrorDisplay';
import { LoadingState } from '../../../components/LoadingState';
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
import { ReviewWithProfile, Role } from '../../../types/supabase';
import { reviewValidationSchema } from '../../../lib/validationSchemas';
import { validateForm } from '../../../lib/validationUtils';
import ProjectLeadSelector from '../../../components/ProjectLeadSelector';
import { validateKantataProject } from '../../../lib/supabaseUtils';





// Extending the existing ReviewWithProfile type to include kantataProjectId
interface ExtendedReviewWithProfile extends ReviewWithProfile {
  kantataProjectId?: string;
}

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
  const [review, setReview] = useState<ExtendedReviewWithProfile | null>(null);
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
  const [kantataProjectId, setKantataProjectId] = useState('');
  
  // Kantata Validation State
  const [isValidatingKantata, setIsValidatingKantata] = useState(false);
  const [kantataValidationError, setKantataValidationError] = useState<string | null>(null);
  const [kantataValidationStatus, setKantataValidationStatus] = useState<'idle' | 'valid' | 'invalid' | 'validating'>('idle');
  
  // Image state
  const [graphImage, setGraphImage] = useState<File | null>(null);
  const [graphImageUrl, setGraphImageUrl] = useState('');
  const [graphImageError, setGraphImageError] = useState<string | null>(null);
  const [graphImageTouched, setGraphImageTouched] = useState<boolean>(false);
  
  // Form validation state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [newLeadId, setNewLeadId] = useState<string>('');

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
        const transformedReview: ExtendedReviewWithProfile = {
          id: reviewData.id,
          title: reviewData.title || '',
          description: reviewData.description || '',
          graphImageUrl: reviewData.graph_image_url || '',
          status: (reviewData.status || 'Submitted') as 'Submitted' | 'In Review' | 'Needs Work' | 'Approved',
          userId: reviewData.user_id,
          createdAt: reviewData.created_at,
          updatedAt: reviewData.updated_at,
          accountName: reviewData.account_name || '',
          orgId: reviewData.org_id || '',
          segment: (reviewData.segment || 'Enterprise') as 'Enterprise' | 'MidMarket',
          remoteAccess: !!reviewData.remote_access,
          graphName: reviewData.graph_name || '',
          useCase: reviewData.use_case || '',
          customerFolder: reviewData.customer_folder || '',
          handoffLink: reviewData.handoff_link || '',
          kantataProjectId: reviewData.kantata_project_id || '',
          // Use the correct Role type for the user object
          user: {
            id: reviewData.user_id,
            name: 'User',
            email: '',
            createdAt: reviewData.created_at,
            role: 'Member' as Role
          }
        };
        
        setReview(transformedReview);
        
        // Set form state - adding nullish coalescing to ensure string values
        setTitle(transformedReview.title || '');
        setDescription(transformedReview.description || '');
        setAccountName(transformedReview.accountName || '');
        setOrgId(transformedReview.orgId || '');
        setSegment(transformedReview.segment || 'Enterprise');
        setRemoteAccess(transformedReview.remoteAccess || false);
        setGraphName(transformedReview.graphName || '');
        setUseCase(transformedReview.useCase || '');
        setCustomerFolder(transformedReview.customerFolder || '');
        setHandoffLink(transformedReview.handoffLink || '');
        setKantataProjectId(transformedReview.kantataProjectId || '');
        
        setNewLeadId(transformedReview.projectLeadId || '');
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
    const values = {
      title,
      description,
      accountName,
      kantataProjectId,
      customerFolder,
      handoffLink
    };
    
    const schema = {
      title: reviewValidationSchema.title,
      description: reviewValidationSchema.description,
      accountName: reviewValidationSchema.accountName,
      kantataProjectId: reviewValidationSchema.kantataProjectId,
      customerFolder: reviewValidationSchema.customerFolder,
      handoffLink: reviewValidationSchema.handoffLink
    };
    
    const errors = validateForm(values, schema);
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle field blur for validation
  const handleBlur = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    // Manual validation if needed
  }, []);
  
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
  
  // Kantata Validation Function
  const handleKantataValidation = useCallback(async (projectId: string | undefined): Promise<{isValid: boolean; message: string}> => {
    if (!projectId) {
      setKantataValidationError(null);
      setKantataValidationStatus('idle');
      return { isValid: true, message: '' };
    }
    setIsValidatingKantata(true);
    setKantataValidationError(null);
    setKantataValidationStatus('validating');
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('Auth session error.');
      const token = session.access_token;

      const response = await fetch('/api/kantata/validate-project', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ kantataProjectId: projectId }),
      });
      const result = await response.json();
      if (!response.ok) {
        setKantataValidationError(result.message || 'Validation failed');
        setKantataValidationStatus('invalid');
        return { isValid: false, message: result.message };
      } else {
        setKantataValidationError(null);
        setKantataValidationStatus('valid');
        return { isValid: true, message: result.message };
      }
    } catch (error) {
      console.error('Kantata validation API call failed:', error);
      const message = error instanceof Error ? error.message : 'Network error';
      setKantataValidationError(message);
      setKantataValidationStatus('invalid');
      return { isValid: false, message };
    } finally {
      setIsValidatingKantata(false);
    }
  }, []);
  
  // useEffect for Kantata Blur Validation
  useEffect(() => {
    const kantataInput = document.querySelector('input[name="kantataProjectId"]');
    if (!kantataInput) return;

    const onBlur = () => {
      // Only validate if the field has been touched
      if (touched.kantataProjectId) {
          handleKantataValidation(kantataProjectId);
      }
    };

    kantataInput.addEventListener('blur', onBlur);
    return () => {
      kantataInput.removeEventListener('blur', onBlur);
    };
  // Dependencies: touched state, current kantata ID value, and the stable validation function
  }, [touched.kantataProjectId, kantataProjectId, handleKantataValidation]);
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setFormErrors({});
    setKantataValidationError(null); // Clear previous validation error

    // Basic manual validation (example)
    const errors: Record<string, string> = {};
    if (!title) errors.title = 'Title is required';
    // ... add other basic required field checks ...
    if (!customerFolder) errors.customerFolder = 'Customer Folder is required';
    if (!handoffLink) errors.handoffLink = 'Handoff Link is required';

    // --- START: Trigger Kantata Validation on Submit --- 
    let kantataIsValid = true;
    if (kantataProjectId) { // Only validate if ID is present
      console.log('Validating Kantata ID on submit...');
      const validationResult = await handleKantataValidation(kantataProjectId);
      kantataIsValid = validationResult.isValid;
      if (!kantataIsValid) {
        // Error state is already set by handleKantataValidation
        console.log('Kantata validation failed during submit.');
        setSubmitting(false);
        return; // Stop submission
      }
      console.log('Kantata validation passed during submit.');
    }
    // --- END: Trigger Kantata Validation on Submit --- 

    // If basic validation failed, stop
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setSubmitting(false);
      return;
    }

    try {
      // ... (rest of submit logic: get token, prepare updateData) ...
       const { data: sessionData } = await supabase.auth.getSession();
       const token = sessionData.session?.access_token;
       if (!token) throw new Error('Authentication token not found');

       const updateData = {
         title,
         description,
         account_name: accountName,
         org_id: orgId,
         segment,
         remote_access: remoteAccess,
         graph_name: graphName,
         use_case: useCase,
         customer_folder: customerFolder,
         handoff_link: handoffLink,
         kantata_project_id: kantataProjectId, // Include updated ID
         // project_lead_id: newLeadId, // Should be handled separately?
       };

      // ... (API call to PATCH /api/reviews/[id]) ...
       const response = await fetch(`/api/reviews/${id}`, {
         method: 'PATCH',
         headers: {
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
         },
         body: JSON.stringify(updateData)
       });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update review');
      }

      console.log('Review updated successfully');
      router.push(`/reviews/${id}`); // Redirect back to review page

    } catch (err) {
      console.error('Error updating review:', err);
      setError(err instanceof Error ? err.message : 'Failed to update review');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Loading/Auth/Error checks
  if (loading || authLoading) return <LoadingState />;
  if (!user) return <p>Please log in.</p>; // Or redirect
  if (error) return <ErrorDisplay error={error} />;
  if (!review || !isAuthorized) {
    return <ErrorDisplay error="Review not found or you are not authorized to edit it." />;
  }

  // <<< Update button disabled logic >>>
  const buttonShouldBeDisabled = 
    submitting || 
    isValidatingKantata ||
    kantataValidationStatus === 'invalid';
    // We are not using formErrors state from useForm here

  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Edit Graph Review</h1>
        
        {error && <ErrorDisplay error={error} />}

        <form onSubmit={handleSubmit}>
          {/* ... other fields using useState variables and onChange handlers ... */}
           <TextInput
              id="title"
              name="title"
              label="Title"
              value={title} // Use state variable
              onChange={(e) => setTitle(e.target.value)} // Use state setter
              onBlur={() => handleBlur('title')} // Use state handler
              error={formErrors.title}
              touched={touched.title}
              required
              maxLength={FIELD_LIMITS.TITLE_MAX_LENGTH}
            />
            {/* ... similarly for other fields: description, accountName, orgId, etc. ... */}
            
           {/* Kantata Project ID */} 
           <div className="mb-4">
              <TextInput 
                id="kantataProjectId"
                name="kantataProjectId" 
                label="Kantata Project ID (Optional)" 
                value={kantataProjectId} // Use state variable
                onChange={(e) => setKantataProjectId(e.target.value)} // Use state setter
                onBlur={() => handleBlur('kantataProjectId')} // Use state handler
                maxLength={FIELD_LIMITS.KANTATA_PROJECT_ID_MAX_LENGTH} 
                // Add visual cues for validation status
                className={
                  kantataValidationStatus === 'validating' ? 'border-yellow-500' : 
                  kantataValidationStatus === 'invalid' ? 'border-red-500' : 
                  kantataValidationStatus === 'valid' ? 'border-green-500' : ''
                }
                touched={touched.kantataProjectId}
                // Error state managed separately
              />
              {isValidatingKantata && <p className="text-sm text-yellow-600 mt-1">Validating...</p>}
              {kantataValidationError && <p className="text-sm text-red-600 mt-1">{kantataValidationError}</p>}
              {kantataValidationStatus === 'valid' && <p className="text-sm text-green-600 mt-1">Kantata Project ID is valid.</p>}
          </div>
          
          {/* ... other fields ... */}

          {/* Submit Button */} 
          <div className="flex items-center justify-between mt-8">
            <button
              type="button"
              onClick={() => router.push(`/reviews/${id}`)} // Go back to view page
              className="text-gray-600 hover:underline"
            >
              Cancel
            </button>
            <SubmitButton 
              label="Save Changes"
              isSubmitting={submitting || isValidatingKantata} // Reflect validation state
              disabled={buttonShouldBeDisabled} 
            />
          </div>
        </form>
      </div>
    </Layout>
  );
};

export default EditReview;