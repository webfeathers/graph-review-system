// pages/reviews/[id].tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

// Components and Hooks
import { 
  Layout,
  StatusBadge,
  CommentSection,
  LoadingState,
  ErrorDisplay,
  ProjectLeadSelector,
  useAuth
} from '../../components';

// API
import { 
  getReviewById, 
  updateReviewStatus, 
  updateProjectLead 
} from '../../lib/api';
import { supabase } from '../../lib/supabase';

// Types
import { ReviewWithProfile, CommentWithProfile, Profile } from '../../types/supabase';

const ReviewPage: NextPage = () => {
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const { id } = router.query;
  const [review, setReview] = useState<ReviewWithProfile | null>(null);
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [isAuthor, setIsAuthor] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<ReviewWithProfile['status']>();
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Project Lead related state
  const [projectLead, setProjectLead] = useState<Profile | null>(null);
  const [isChangingLead, setIsChangingLead] = useState(false);
  const [newLeadId, setNewLeadId] = useState<string>('');
  const [updatingLead, setUpdatingLead] = useState(false);

  // Fetch review data
  useEffect(() => {
    const fetchReview = async () => {
      // Don't fetch if we don't have an ID or if auth is still loading
      if (!router.isReady || !id || authLoading) {
        console.log('Skipping fetch - missing requirements:', { 
          isReady: router.isReady, 
          id, 
          authLoading 
        });
        return;
      }

      // Show success message if coming from new review creation
      if (router.query.success === 'true' && router.query.message) {
        toast.success(router.query.message as string);
        // Remove the query params after showing the message
        router.replace(`/reviews/${id}`, undefined, { shallow: true });
      }

      // Don't fetch if we're not authenticated
      if (!user) {
        console.log('User not authenticated, redirecting to login');
        router.push('/login');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        console.log('Fetching review with ID:', id);

        // Get session token
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        
        if (!token) {
          console.error('No authentication token available');
          throw new Error('No authentication token available');
        }

        console.log('Making API request with token:', token.substring(0, 10) + '...');

        // Fetch the review data via API
        const response = await fetch(`/api/reviews/${id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        console.log('API Response status:', response.status);
        const data = await response.json();
        console.log('API Response data:', data);

        if (!response.ok) {
          console.error('API request failed:', {
            status: response.status,
            statusText: response.statusText,
            data
          });
          throw new Error(data.message || 'Failed to fetch review');
        }

        if (!data.success || !data.data) {
          console.error('Invalid API response format:', data);
          throw new Error(data.message || 'Invalid response format');
        }

        const reviewData = data.data;
        console.log('Review data received:', {
          id: reviewData.id,
          title: reviewData.title,
          hasUser: !!reviewData.user,
          hasProjectLead: !!reviewData.projectLead,
          commentCount: reviewData.comments?.length || 0,
          status: reviewData.status
        });

        if (!reviewData.title) {
          console.warn('Review has no title:', reviewData);
        }

        // Transform the data to match the frontend format
        const transformedReview = {
          ...reviewData,
          userId: reviewData.user_id,
          createdAt: reviewData.created_at,
          updatedAt: reviewData.updated_at,
          accountName: reviewData.account_name,
          orgId: reviewData.org_id,
          kantataProjectId: reviewData.kantata_project_id,
          segment: reviewData.segment,
          remoteAccess: reviewData.remote_access,
          graphName: reviewData.graph_name,
          useCase: reviewData.use_case,
          customerFolder: reviewData.customer_folder,
          handoffLink: reviewData.handoff_link,
          projectLeadId: reviewData.project_lead_id
        };

        console.log('Setting review state with transformed data:', {
          id: transformedReview.id,
          title: transformedReview.title,
          status: transformedReview.status
        });

        setReview(transformedReview);
        setCurrentStatus(transformedReview.status);
        setIsAuthor(transformedReview.userId === user.id);
        
        // Set comments from the review data since they're now included
        if (reviewData.comments) {
          setComments(reviewData.comments);
        }
      } catch (err) {
        console.error('Error fetching review:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to load review';
        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [router.isReady, id, user, authLoading, router]);

  const handleStatusChange = async (newStatus: ReviewWithProfile['status']) => {
    if (!user || !review || isUpdating) return;
    
    try {
      setIsUpdating(true);
      setError(null);

      // Optimistically update UI
      const previousStatus = currentStatus;
      setCurrentStatus(newStatus);

      // Get the session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No valid session found');
      }

      console.log('Sending status update request:', {
        id,
        newStatus,
        currentTitle: review.title,
        token: session.access_token.substring(0, 10) + '...'
      });

      // Use the API endpoint
      const response = await fetch(`/api/reviews/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ 
          status: newStatus,
          title: review.title
        })
      });

      const responseData = await response.json();
      console.log('Received response:', responseData);

      if (!response.ok || !responseData.success) {
        // Revert optimistic update on failure
        setCurrentStatus(previousStatus);
        throw new Error(responseData.message || 'Failed to update status');
      }

      // Update local state with the complete review data
      if (responseData.data) {
        console.log('Updating review state with:', {
          id: responseData.data.id,
          title: responseData.data.title,
          status: responseData.data.status
        });

        // Transform the data to match the frontend format
        const transformedReview = {
          ...responseData.data,
          userId: responseData.data.user_id,
          createdAt: responseData.data.created_at,
          updatedAt: responseData.data.updated_at,
          accountName: responseData.data.account_name,
          orgId: responseData.data.org_id,
          kantataProjectId: responseData.data.kantata_project_id,
          segment: responseData.data.segment,
          remoteAccess: responseData.data.remote_access,
          graphName: responseData.data.graph_name,
          useCase: responseData.data.use_case,
          customerFolder: responseData.data.customer_folder,
          handoffLink: responseData.data.handoff_link,
          projectLeadId: responseData.data.project_lead_id
        };

        setReview(transformedReview);
        setCurrentStatus(transformedReview.status);
        toast.success('Status updated successfully');
      } else {
        throw new Error('No data received in response');
      }

    } catch (err) {
      console.error('Error updating status:', err);
      if (err instanceof Error) {
        console.error('Error details:', {
          message: err.message,
          stack: err.stack
        });
      }
      const errorMessage = err instanceof Error ? err.message : 'Failed to update status';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Handler to change project lead
  const handleChangeProjectLead = async () => {
    if (!newLeadId || !review) return;
    
    try {
      setUpdatingLead(true);
      setError(null);
      
      // Check if user is admin before proceeding
      if (!isAdmin()) {
        throw new Error('Only administrators can change the Project Lead');
      }
      
      // Call the API endpoint
      const response = await fetch(`/api/reviews/${review.id}/project-lead`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ newLeadId })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update project lead');
      }

      const { data } = await response.json();
      
      // Update local state with the transformed data
      setReview({
        ...review,
        projectLeadId: newLeadId,
        projectLead: data.projectLead ? {
          id: data.projectLead.id,
          name: data.projectLead.name || 'Unknown User',
          email: data.projectLead.email || '',
          createdAt: data.projectLead.created_at,
          role: data.projectLead.role || 'Member'
        } : undefined
      });
      
      // Reset UI state
      setIsChangingLead(false);
      setNewLeadId('');
      
      // Show success message
      toast.success('Project lead updated successfully');
      
    } catch (err) {
      console.error('Error changing project lead:', err);
      setError(err instanceof Error ? err.message : 'Failed to update project lead');
      toast.error('Failed to update project lead');
    } finally {
      setUpdatingLead(false);
    }
  };

  // Loading/Auth/Error checks
  if (loading || authLoading) {
    console.log('Showing loading state:', { loading, authLoading });
    return <LoadingState />;
  }
  
  if (!user) {
    console.log('No user, showing login prompt');
    return <p>Please log in.</p>;
  }
  
  if (error) {
    console.log('Showing error:', error);
    return <ErrorDisplay error={error} />;
  }
  
  if (!review) {
    console.log('No review data available');
    return <ErrorDisplay error="Review not found or you are not authorized to view it." />;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          {/* Title with Edit button and Status Badge */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              {/* Edit button - now an icon button to the left of the title */}
              {(isAuthor || isAdmin()) && (
                <button 
                  onClick={() => window.location.href = `/reviews/edit/${review.id}`}
                  className="bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300"
                  title="Edit Review"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
              )}
              <h1 className="text-3xl font-bold">{review.title}</h1>
            </div>
            <StatusBadge status={currentStatus || review.status} />
          </div>

          {/* Status buttons - moved under title and made smaller */}
          {/* Show status buttons to everyone */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              
              {/* Regular status buttons - show to everyone */}
              {(['Submitted','In Review', 'Needs Work'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={status === currentStatus || isUpdating}
                  className={`px-3 py-1 text-sm rounded ${
                    status === currentStatus
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  } disabled:opacity-50 cursor-pointer`}
                  type="button"
                >
                  {status}
                </button>
              ))}


              {/* Approved button - only shown to admins */}
              {isAdmin() && (
                <button
                  onClick={() => handleStatusChange('Approved')}
                  disabled={'Approved' === currentStatus || isUpdating}
                  className={`px-3 py-1 text-sm rounded ${
                    'Approved' === currentStatus
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  } disabled:opacity-50 cursor-pointer`}
                  type="button"
                >
                  Approved
                </button>
              )}
            </div>
          </div>
          
          {/* Project Info Section - NEW */}
          <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
            <h3 className="text-lg font-medium mb-3 text-gray-700">Project Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="mb-4">
                  <span className="font-medium">Created by:</span>{' '}
                  <span>{review.user.name} on {new Date(review.createdAt).toLocaleDateString()}</span>
                </div>
                
                <div className="mb-4">
                  <span className="font-medium">Last updated:</span>{' '}
                  <span>{new Date(review.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              <div>
                {/* Project Lead section */}
                <div className="mb-4">
                  <span className="font-medium">Project Lead:</span>{' '}
                  {review.projectLead ? (
                    <span>{review.projectLead.name} ({review.projectLead.email})</span>
                  ) : (
                    <span className="text-gray-500">Not assigned</span>
                  )}
                  
                  {/* Admin can change project lead */}
                  {isAdmin() && (
                    <div className="mt-2">
                      {!isChangingLead ? (
                        <button
                          onClick={() => setIsChangingLead(true)}
                          className="text-blue-500 text-sm hover:underline"
                        >
                          Change Project Lead
                        </button>
                      ) : (
                        <div className="flex items-center mt-2">
                          <ProjectLeadSelector
                            value={newLeadId}
                            onChange={setNewLeadId}
                            className="text-sm py-1"
                          />
                          <button
                            onClick={handleChangeProjectLead}
                            disabled={!newLeadId || updatingLead}
                            className="ml-2 px-2 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 disabled:opacity-50"
                          >
                            {updatingLead ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setIsChangingLead(false);
                              setNewLeadId('');
                            }}
                            className="ml-2 px-2 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
            <p className="mb-6">{review.description}</p>
            
            {/* Customer Info Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-3 text-gray-700">Customer Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium">Account Name:</span> {review.accountName || 'Not specified'}
                  </div>
                  <div>
                    <span className="font-medium">OrgID:</span> {review.orgId || 'Not specified'}
                  </div>

                  {/* Kantata Project ID field with a clickable icon */}
                  <div className="flex items-center">
                    <span className="font-medium">Kantata Project ID:</span>
                    <span className="mx-1">{review.kantataProjectId || 'Not specified'}</span>
                    {review.kantataProjectId && (
                      <a 
                        href={`https://leandata.mavenlink.com/workspaces/${review.kantataProjectId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-600 hover:text-blue-800"
                        title="Open in Kantata"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className="h-5 w-5" 
                          fill="none" 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={2} 
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
                          />
                        </svg>
                      </a>
                    )}
                  </div>
                  <div>
                    <span className="font-medium">Segment:</span> {review.segment || 'Not specified'}
                  </div>
                  <div>
                    <span className="font-medium">Remote Access:</span> {review.remoteAccess ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>

              {/* Graph Info Section */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-3 text-gray-700">Graph Information</h3>
                <div className="space-y-3">
                  <div>
                    <span className="font-medium">Graph Name:</span> {review.graphName || 'Not specified'}
                  </div>
                  <div>
                    <span className="font-medium">Use Case:</span>
                    <p className="mt-1 text-gray-600">{review.useCase || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Links Section */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-medium mb-3 text-gray-700">Important Links</h3>
              <div className="space-y-3">
                <div>
                  <span className="font-medium">Customer Folder:</span>{' '}
                  {review.customerFolder ? (
                    <a 
                      href={review.customerFolder} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      Open in Google Drive
                    </a>
                  ) : (
                    <span className="text-gray-500">Not specified</span>
                  )}
                </div>
                <div>
                  <span className="font-medium">Handoff Record:</span>{' '}
                  {review.handoffLink ? (
                    <a 
                      href={review.handoffLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      View in Salesforce
                    </a>
                  ) : (
                    <span className="text-gray-500">Not specified</span>
                  )}
                </div>
              </div>
            </div>
          </div>
          
          <CommentSection 
            comments={comments} 
            reviewId={review.id}
            onCommentAdded={(newComment) => {
              // Update comments state with the new comment
              setComments(prevComments => [...prevComments, newComment]);
            }}
          />

          <div className="mt-8 text-center">
            <Link 
              href="/reviews" 
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Back to All Reviews
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ReviewPage;