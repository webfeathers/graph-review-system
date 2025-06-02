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
import Link from 'next/link';
import dayjs from 'dayjs';





// Extending the existing ReviewWithProfile type to include kantataProjectId
interface ExtendedReviewWithProfile extends ReviewWithProfile {
  kantataProjectId?: string;
  reviewType: 'customer' | 'template';
  fileLink?: string;
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

  // Add state for file upload and upload progress
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // Load review data on mount
  useEffect(() => {
    // Only run once on mount
    const fetchReview = async () => {
      // Skip if no id, still loading auth, or no user
      if (!id || authLoading || !user) {
        return;
      }
     
      try {
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
        
        const data = await response.json();
        
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
        
        // Check authorization
        const isAuthor = reviewData.user_id === user.id;
        const userIsAdmin = isAdmin ? isAdmin() : false;
        
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
          status: (reviewData.status || 'Draft') as 'Draft' | 'Submitted' | 'In Review' | 'Needs Work' | 'Approved',
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
          reviewType: reviewData.review_type ?? 'customer',
          fileLink: reviewData.file_link ?? undefined,
          templateFileVersions: reviewData.templateFileVersions || [],
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
    
    // Required fields
    if (!title) errors.title = 'Title is required';
    if (!newLeadId) errors.projectLeadId = 'Project Lead is required';
    if (!kantataProjectId) errors.kantataProjectId = 'Kantata Project ID is required';
    if (!segment) errors.segment = 'Please select a customer segment';
    
    // Optional fields with validation
    if (customerFolder && !customerFolder.startsWith('http')) {
      errors.customerFolder = 'Please enter a valid URL for the customer folder';
    }
    if (handoffLink && !handoffLink.startsWith('http')) {
      errors.handoffLink = 'Please enter a valid URL for the handoff link';
    }
    if (useCase && useCase.length < 10) {
      errors.useCase = 'Use case must be at least 10 characters if provided';
    }
    
    return errors;
  };
  
  // Handle field blur for validation
  const handleBlur = useCallback((field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    // Run validation for the specific field
    const errors = validate();
    setFormErrors(errors);
  }, [title, description, accountName, orgId, segment, remoteAccess, graphName, useCase, customerFolder, handoffLink, kantataProjectId, newLeadId]);
  
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
    
    // Mark all fields as touched
    const allTouched = Object.keys(touched).reduce((acc, key) => ({ ...acc, [key]: true }), {});
    setTouched(allTouched);
    
    // Validate form
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      // Show error message at the top of the form
      setError('Please fill in all required fields before submitting');
      return;
    }
    
    try {
      setSubmitting(true);
      setError(null);
      setFormErrors({});
      
      // Get token for authentication
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      // Prepare the review data
      const reviewData = {
        title,
        description,
        accountName,
        orgId,
        segment,
        remoteAccess,
        graphName,
        useCase,
        customerFolder,
        handoffLink,
        kantataProjectId,
        projectLeadId: newLeadId,
        status: review?.status
      };
      
      // Update the review
      const response = await fetch(`/api/reviews/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(reviewData)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update review');
      }
      
      // Redirect to the review page
      router.push(`/reviews/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating the review');
    } finally {
      setSubmitting(false);
    }
  };
  
  // Helper to refresh review data (for version list)
  const refreshReview = async () => {
    if (!id || !user) return;
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('No authentication token available');
      const response = await fetch(`/api/reviews/${id}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok && data.success && data.data) {
        setReview(data.data);
      }
    } catch (err) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  // Handle file version upload
  const handleFileVersionUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'text/plain') {
      setUploadError('Only .txt files are allowed');
      return;
    }
    setUploading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('No authentication token available');
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`/api/reviews/${id}/template-file-version`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        setUploadError(data.error || 'Failed to upload file version');
      } else {
        setUploadSuccess('File version uploaded successfully');
        if (data.review) {
          // Normalize templateFileVersions for consistency
          let templateFileVersions = [];
          if (data.review.template_file_versions) {
            templateFileVersions = (data.review.template_file_versions || []).map((v: any) => ({
              id: v.id,
              reviewId: v.review_id,
              fileUrl: v.file_url,
              uploadedAt: v.uploaded_at,
              uploadedBy: v.uploaded_by,
              uploaderName: v.uploader?.name || null,
            }));
          } else if (data.review.templateFileVersions) {
            templateFileVersions = data.review.templateFileVersions;
          }
          setReview((prev) => prev ? {
            ...prev,
            ...data.review,
            templateFileVersions,
          } : {
            ...data.review,
            templateFileVersions,
          });
        } else {
          await refreshReview();
        }
      }
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload file version');
    } finally {
      setUploading(false);
    }
  };
  
  // Loading/Auth/Error checks
  if (loading || authLoading) return <LoadingState />;
  if (!user) return <p>Please log in.</p>; // Or redirect
  if (!review || !isAuthorized) {
    return <ErrorDisplay error="Review not found or you are not authorized to edit it." />;
  }

  // Update button disabled logic
  const buttonShouldBeDisabled = submitting || isValidatingKantata || kantataValidationStatus === 'invalid' || Object.keys(formErrors).length > 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Edit Graph Review</h1>
        
        {error && (
          <div className="mb-6">
            <ErrorDisplay 
              error={error} 
              onDismiss={() => setError(null)}
            />
          </div>
        )}

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
            helpText={`Maximum ${FIELD_LIMITS.TITLE_MAX_LENGTH} characters`}
          />

          {review.reviewType === 'customer' && (
            <>
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
                maxLength={FIELD_LIMITS.ACCOUNT_NAME_MAX_LENGTH}
              />

              <div className="grid grid-cols-3 gap-4">
                <TextInput
                  id="kantataProjectId"
                  name="kantataProjectId"
                  label="Kantata Project ID"
                  placeholder="Enter associated Kantata (Mavenlink) project ID"
                  value={kantataProjectId}
                  onChange={(e) => setKantataProjectId(e.target.value)}
                  onBlur={() => handleBlur('kantataProjectId')}
                  error={formErrors.kantataProjectId || kantataValidationError}
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
                  helpText="The customer's organization identifier"
                  required
                />

                <div className="pt-6">
                  <Checkbox
                    id="remoteAccess"
                    label="Remote Access Granted"
                    checked={remoteAccess}
                    onChange={(e) => setRemoteAccess(e.target.checked)}
                    helpText="Check if remote access has been granted"
                  />
                </div>
              </div>

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
                  { value: '', label: 'Please Select' },
                  { value: 'MidMarket', label: 'MidMarket' },
                  { value: 'Enterprise', label: 'Enterprise' }
                ]}
                required
                helpText="Select the customer segment"
              />
            </>
          )}

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
            helpText="A descriptive name to help identify the specific graph in the customer's organization"
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
            rows={6}
            helpText={`Maximum ${FIELD_LIMITS.DESCRIPTION_MAX_LENGTH} characters`}
          />

          {review.reviewType === 'customer' && (
            <>
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
            </>
          )}

          {/* Template Review File Versioning UI */}
          {review.reviewType === 'template' && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-2">Template File Versions</h2>
              {uploadError && <ErrorDisplay error={uploadError} onDismiss={() => setUploadError(null)} />}
              {uploadSuccess && <div className="text-green-600 mb-2">{uploadSuccess}</div>}
              <input
                type="file"
                accept=".txt"
                onChange={handleFileVersionUpload}
                disabled={uploading}
                className="mb-2"
              />
              {uploading && <div className="text-blue-600 mb-2">Uploading...</div>}
              {review.templateFileVersions && review.templateFileVersions.length > 0 ? (
                <table className="min-w-full border text-sm mt-2">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">Version</th>
                      <th className="border px-2 py-1">Date Uploaded</th>
                      <th className="border px-2 py-1">Uploaded by</th>
                      <th className="border px-2 py-1">Download</th>
                    </tr>
                  </thead>
                  <tbody>
                    {review.templateFileVersions?.map((v, idx) => (
                      <tr key={v.id}>
                        <td className="border px-2 py-1">{review.templateFileVersions?.length ? review.templateFileVersions.length - idx : ''}</td>
                        <td className="border px-2 py-1">{v.uploadedAt ? dayjs(v.uploadedAt).format('YYYY-MM-DD HH:mm') : ''}</td>
                        <td className="border px-2 py-1">{v.uploaderName || v.uploadedBy || 'Unknown'}</td>
                        <td className="border px-2 py-1">
                          <a href={v.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Download</a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-gray-500">No file versions uploaded yet.</div>
              )}
            </div>
          )}

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
              className="mt-6"
            />
          </div>
        </Form>
      </div>
    </div>
  );
};

export default EditReview;