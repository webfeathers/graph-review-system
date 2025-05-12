// pages/reviews/edit/[id].tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import React, { useState, useEffect, useCallback } from 'react';
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
  
  // Form validation state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [newLeadId, setNewLeadId] = useState<string>('');

  // Load review data on mount
  useEffect(() => {
    // Only run once on mount
    const fetchReview = async () => {
      // Skip if no id, still loading auth, or no user
      if (!id || authLoading || !user) {
        console.log('Skipping fetch - missing requirements:', { id, authLoading, hasUser: !!user });
        return;
      }
     
      try {
        console.log('Fetching review data for ID:', id);
        setLoading(true);
        
        // Get token for authentication
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        
        if (!token) {
          console.error('No authentication token available');
          throw new Error('No authentication token available');
        }
        
        // Fetch the review data via API
        const response = await fetch(`/api/reviews/${id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = await response.json();
        console.log('API Response:', data);
        
        if (!response.ok) {
          if (response.status === 403) {
            setError('You do not have permission to edit this review');
            setIsAuthorized(false);
            return;
          }
          throw new Error(data.message || 'Failed to fetch review');
        }
        
        if (!data.success || !data.data) {
          throw new Error('Invalid response format');
        }
        
        const reviewData = data.data;
        console.log('Review data loaded successfully:', {
          id: reviewData.id,
          title: reviewData.title,
          userId: reviewData.user_id,
          currentUser: user.id
        });
        
        // Check authorization
        const isAuthor = reviewData.user_id === user.id;
        const userIsAdmin = isAdmin ? isAdmin() : false;
        
        console.log('Authorization check:', {
          isAuthor,
          userIsAdmin,
          reviewUserId: reviewData.user_id,
          currentUserId: user.id
        });
        
        if (!isAuthor && !userIsAdmin) {
          setError('You are not authorized to edit this review');
          setIsAuthorized(false);
          return;
        }
        
        setIsAuthorized(true);
        
        // Set the review data - transform from snake_case to camelCase
        const transformedReview: ExtendedReviewWithProfile = {
          id: reviewData.id,
          title: reviewData.title || '',
          description: reviewData.description || '',
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
          projectLeadId: reviewData.project_lead_id || '',
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
        
        // Set the project lead ID
        setNewLeadId(transformedReview.projectLeadId || '');
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
      orgId,
      segment,
      graphName,
      useCase,
      customerFolder,
      handoffLink,
      kantataProjectId
    };
    
    // Only validate required fields
    const schema = {
      title: reviewValidationSchema.title,
      description: reviewValidationSchema.description,
      accountName: reviewValidationSchema.accountName,
      customerFolder: reviewValidationSchema.customerFolder,
      handoffLink: reviewValidationSchema.handoffLink,
      graphName: reviewValidationSchema.graphName
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
        body: JSON.stringify({ 
          kantataProjectId: projectId,
          currentReviewId: id
        }),
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
  }, [id]);
  
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
    console.log('Form submission started');
    setSubmitting(true);
    setError(null);
    setFormErrors({});
    setKantataValidationError(null);

    // Mark all fields as touched to show validation errors
    const allFields = [
      'title', 'description', 'accountName', 'orgId', 'segment',
      'graphName', 'useCase', 'customerFolder', 'handoffLink', 'kantataProjectId'
    ];
    const newTouched = allFields.reduce((acc, field) => ({ ...acc, [field]: true }), {});
    setTouched(newTouched);

    // Validate all fields
    console.log('Validating form fields');
    if (!validate()) {
      console.log('Form validation failed:', formErrors);
      setSubmitting(false);
      return;
    }
    console.log('Form validation passed');

    // --- START: Trigger Kantata Validation on Submit --- 
    let kantataIsValid = true;
    if (kantataProjectId) {
      console.log('Validating Kantata ID on submit...');
      const validationResult = await handleKantataValidation(kantataProjectId);
      kantataIsValid = validationResult.isValid;
      if (!kantataIsValid) {
        console.log('Kantata validation failed during submit.');
        setSubmitting(false);
        return;
      }
      console.log('Kantata validation passed during submit.');
    }
    // --- END: Trigger Kantata Validation on Submit --- 

    try {
      console.log('Getting auth session');
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Authentication token not found');

      // Only include project_lead_id if user is admin
      const updateData: {
        title: string;
        description: string;
        account_name: string;
        org_id: string;
        segment: string;
        remote_access: boolean;
        graph_name: string;
        use_case: string;
        customer_folder: string;
        handoff_link: string;
        kantata_project_id: string;
        project_lead_id?: string;
      } = {
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
        kantata_project_id: kantataProjectId
      };

      // Only include project_lead_id if user is admin
      if (isAdmin && typeof isAdmin === 'function' && isAdmin()) {
        updateData.project_lead_id = newLeadId;
      }

      console.log('Sending update request with data:', updateData);
      const response = await fetch(`/api/reviews/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      console.log('Received response:', response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Update failed:', errorData);
        throw new Error(errorData.message || 'Failed to update review');
      }

      const responseData = await response.json();
      console.log('Raw API response:', responseData);
      
      if (responseData.success && responseData.data) {
        console.log('Updating form with data:', responseData.data);
        // Update the local review state with the new data
        const updatedReview = responseData.data;
        setReview(updatedReview);
        
        // Update all form fields with the new data
        setTitle(updatedReview.title || '');
        setDescription(updatedReview.description || '');
        setAccountName(updatedReview.account_name || '');
        setOrgId(updatedReview.org_id || '');
        setSegment(updatedReview.segment || 'Enterprise');
        setRemoteAccess(updatedReview.remote_access || false);
        setGraphName(updatedReview.graph_name || '');
        setUseCase(updatedReview.use_case || '');
        setCustomerFolder(updatedReview.customer_folder || '');
        setHandoffLink(updatedReview.handoff_link || '');
        setKantataProjectId(updatedReview.kantata_project_id || '');
        setNewLeadId(updatedReview.project_lead_id || '');
        
        // Force a re-render by updating a state
        setSubmitting(false);
        setSubmitting(true);
      } else {
        console.error('Invalid response format:', responseData);
      }

      // Redirect to the review page
      window.location.href = `/reviews/${id}`;
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
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Edit Graph Review</h1>
        
        {error && <ErrorDisplay error={error} />}

        <Form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="projectLeadId" className="block text-sm font-medium text-gray-700 mb-1">
              Project Lead
            </label>
            <ProjectLeadSelector
              value={newLeadId}
              onChange={setNewLeadId}
              disabled={!(isAdmin && typeof isAdmin === 'function' && isAdmin()) && user?.id !== review?.userId}
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => handleBlur('title')}
            error={formErrors.title}
            touched={touched.title}
            required
            maxLength={FIELD_LIMITS.TITLE_MAX_LENGTH}
            helpText={`Maximum ${FIELD_LIMITS.TITLE_MAX_LENGTH} characters`}
          />

          <TextInput
            id="accountName"
            name="accountName"
            label="Account Name"
            placeholder="Enter customer's account name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            onBlur={() => handleBlur('accountName')}
            error={formErrors.accountName}
            touched={touched.accountName}
            required
            maxLength={FIELD_LIMITS.ACCOUNT_NAME_MAX_LENGTH}
          />

          <TextInput
            id="kantataProjectId"
            name="kantataProjectId"
            label="Kantata Project ID"
            placeholder="Enter associated Kantata (Mavenlink) project ID"
            value={kantataProjectId}
            onChange={(e) => setKantataProjectId(e.target.value)}
            onBlur={() => handleBlur('kantataProjectId')}
            error={formErrors.kantataProjectId}
            touched={touched.kantataProjectId}
            maxLength={FIELD_LIMITS.KANTATA_PROJECT_ID_MAX_LENGTH}
            helpText="Link this review to a Kantata (Mavenlink) project"
            required
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
            value={orgId}
            onChange={(e) => setOrgId(e.target.value)}
            onBlur={() => handleBlur('orgId')}
            error={formErrors.orgId}
            touched={touched.orgId}
            maxLength={FIELD_LIMITS.ORG_ID_MAX_LENGTH}
          />

          <SelectInput
            id="segment"
            name="segment"
            label="Segment"
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            onBlur={() => handleBlur('segment')}
            error={formErrors.segment}
            touched={touched.segment}
            options={[
              { value: 'Enterprise', label: 'Enterprise' },
              { value: 'MidMarket', label: 'MidMarket' }
            ]}
            required
          />

          <Checkbox
            id="remoteAccess"
            label="Remote Access Granted"
            checked={remoteAccess}
            onChange={(e) => setRemoteAccess(e.target.checked)}
            helpText="Check if remote access has been granted"
          />

          <TextInput
            id="graphName"
            name="graphName"
            label="Graph Name"
            placeholder="e.g., Lead Router Graph, Contact Router Graph"
            value={graphName}
            onChange={(e) => setGraphName(e.target.value)}
            onBlur={() => handleBlur('graphName')}
            error={formErrors.graphName}
            touched={touched.graphName}
            maxLength={FIELD_LIMITS.GRAPH_NAME_MAX_LENGTH}
            required
            helpText={`Maximum ${FIELD_LIMITS.GRAPH_NAME_MAX_LENGTH} characters`}
          />

          <TextArea
            id="description"
            name="description"
            label="Description"
            placeholder="Provide a detailed description of your graph"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => handleBlur('description')}
            error={formErrors.description}
            touched={touched.description}
            required
            rows={6}
            helpText={`Maximum ${FIELD_LIMITS.DESCRIPTION_MAX_LENGTH} characters`}
          />

          <TextArea
            id="useCase"
            name="useCase"
            label="Use Case"
            placeholder="Describe the customer's use case or pain points"
            value={useCase}
            onChange={(e) => setUseCase(e.target.value)}
            onBlur={() => handleBlur('useCase')}
            error={formErrors.useCase}
            touched={touched.useCase}
            rows={4}
            maxLength={FIELD_LIMITS.USE_CASE_MAX_LENGTH}
          />

          <TextInput
            id="customerFolder"
            name="customerFolder"
            label="Customer Folder"
            placeholder="Enter Google Drive folder URL"
            value={customerFolder}
            onChange={(e) => setCustomerFolder(e.target.value)}
            onBlur={() => handleBlur('customerFolder')}
            error={formErrors.customerFolder}
            touched={touched.customerFolder}
            maxLength={FIELD_LIMITS.CUSTOMER_FOLDER_MAX_LENGTH}
            type="url"
          />

          <TextInput
            id="handoffLink"
            name="handoffLink"
            label="Handoff Link"
            placeholder="Enter Salesforce handoff record URL"
            value={handoffLink}
            onChange={(e) => setHandoffLink(e.target.value)}
            onBlur={() => handleBlur('handoffLink')}
            error={formErrors.handoffLink}
            touched={touched.handoffLink}
            maxLength={FIELD_LIMITS.HANDOFF_LINK_MAX_LENGTH}
            type="url"
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
              isSubmitting={submitting || isValidatingKantata}
              label="Save Changes"
              submittingLabel="Saving..."
              disabled={buttonShouldBeDisabled}
              onClick={(e) => {
                console.log('Submit button clicked');
                handleSubmit(e);
              }}
            />
          </div>
        </Form>
      </div>
    </div>
  );
};

export default EditReview;