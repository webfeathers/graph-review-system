// pages/reviews/[id].tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

// Components and Hooks
import { 
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
  const [newLeadId, setNewLeadId] = useState<string>('');
  const [isChangingLead, setIsChangingLead] = useState(false);
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
          // Redirect to login if no token
          router.push('/login');
          return;
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

        if (response.status === 401) {
          // Handle authentication error
          console.error('Authentication error, redirecting to login');
          router.push('/login');
          return;
        }

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
          projectLeadId: reviewData.project_lead_id,
          comments: reviewData.comments?.map((comment: any) => ({
            ...comment,
            createdAt: comment.created_at,
            userId: comment.user_id,
            reviewId: reviewData.id,
            user: comment.user ? {
              ...comment.user,
              createdAt: comment.user.created_at
            } : undefined,
            votes: comment.votes || [],
            voteCount: comment.voteCount || 0,
            userVote: comment.votes?.find((v: any) => v.user_id === user.id)?.vote_type
          }))
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
          projectLeadId: responseData.data.project_lead_id,
          comments: responseData.data.comments?.map((comment: any) => ({
            ...comment,
            createdAt: comment.created_at,
            userId: comment.user_id,
            reviewId: responseData.data.id,
            user: comment.user ? {
              ...comment.user,
              createdAt: comment.user.created_at
            } : undefined,
            votes: comment.votes || [],
            voteCount: comment.voteCount || 0,
            userVote: comment.votes?.find((v: any) => v.user_id === user.id)?.vote_type
          }))
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
  
  // Handler for project lead selection
  const handleProjectLeadChange = (value: string) => {
    setNewLeadId(value);
    setIsChangingLead(true);
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
    return <LoadingState message="Loading review..." />;
  }
  
  if (!user) {
    console.log('No user, showing login prompt');
    return <p>Please log in.</p>;
  }
  
  if (error) {
    return <ErrorDisplay error={error} />;
  }
  
  if (!review) {
    return <ErrorDisplay error="Review not found" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {error && (
        <ErrorDisplay 
          error={error} 
          onDismiss={() => setError(null)} 
          variant="error"
        />
      )}
      
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading review...</p>
        </div>
      ) : review ? (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{review.title}</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Created by {review.user?.email || 'Unknown'} on {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </div>
              {(isAuthor || isAdmin()) && (
                <Link
                  href={`/reviews/edit/${review.id}`}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Review
                </Link>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Status and Project Lead at the top */}
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  review.status === 'Approved' ? 'bg-green-100 text-green-800' :
                  review.status === 'Needs Work' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {review.status}
                </span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Project Lead:</span>
                  {isAdmin() ? (
                    <div className="flex items-center space-x-2">
                      <ProjectLeadSelector
                        value={newLeadId || review.projectLeadId || ''}
                        onChange={handleProjectLeadChange}
                        disabled={updatingLead}
                      />
                      {isChangingLead && (
                        <button
                          onClick={handleChangeProjectLead}
                          disabled={updatingLead}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                          {updatingLead ? 'Updating...' : 'Update'}
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-gray-900">
                      {review.projectLead?.email || 'Not assigned'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Main content in two columns */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Project Details</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Kantata Project ID</label>
                      <div className="mt-1">
                        <a 
                          href={`https://app.kantata.com/project/${review.kantataProjectId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          {review.kantataProjectId}
                        </a>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Customer Folder</label>
                      <div className="mt-1">
                        <a 
                          href={review.customerFolder}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Open Customer Folder
                        </a>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Handoff Link</label>
                      <div className="mt-1">
                        <a 
                          href={review.handoffLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Open Handoff
                        </a>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Remote Access</label>
                      <div className="mt-1 text-gray-900">
                        {review.remoteAccess ? 'Yes' : 'No'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div>
                <h2 className="text-lg font-medium text-gray-900 mb-2">Review Notes</h2>
                <div className="mt-1 prose max-w-none">
                  {review.description}
                </div>
              </div>
            </div>

            {/* Comments Section at the bottom */}
            <div className="border-t border-gray-200 pt-6">
              <CommentSection
                comments={review.comments || []}
                reviewId={review.id}
                onCommentAdded={(newComment) => {
                  setComments(prevComments => [...prevComments, newComment]);
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-600">Review not found</p>
        </div>
      )}
    </div>
  );
};

export default ReviewPage;