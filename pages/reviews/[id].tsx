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
      if (!id || authLoading || !user) {
        return;
      }

      if (!user) {
        router.push(`/login?returnTo=/reviews/${id}`);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          console.error('No authentication token available');
          router.push(`/login?returnTo=/reviews/${id}`);
          return;
        }

        const response = await fetch(`/api/reviews/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.status === 401) {
          router.push(`/login?returnTo=/reviews/${id}`);
          return;
        }

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success || !data.data) {
          throw new Error('Invalid API response format');
        }

        const reviewData = data.data;

        if (!reviewData.title) {
          throw new Error('Review has no title');
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

        setReview(transformedReview);
        setCurrentStatus(transformedReview.status);
        setIsAuthor(transformedReview.userId === user.id);
        
        // Set comments from the review data since they're now included
        if (reviewData.comments) {
          setComments(reviewData.comments);
        }
      } catch (err) {
        console.error('Error fetching review:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch review');
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [id, user, authLoading, router]);

  const handleStatusChange = async (newStatus: ReviewWithProfile['status']) => {
    if (!user || !review) return;
    
    try {
      setIsUpdating(true);

      const response = await fetch(`/api/reviews/${review.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ newStatus })
      });

      if (!response.ok) {
        throw new Error(`Failed to update status: ${response.status}`);
      }

      const responseData = await response.json();

      if (!responseData.success) {
        throw new Error(responseData.message || 'Failed to update status');
      }

      // Update local state with the complete review data
      if (responseData.data) {
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
      }

    } catch (err) {
      console.error('Error updating status:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };
  
  // Handler for project lead selection
  const handleProjectLeadChange = async (newLeadId: string) => {
    if (!user || !review) return;
    
    try {
      setIsChangingLead(true);
      setUpdatingLead(true);

      const response = await fetch(`/api/reviews/${review.id}/project-lead`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({ newLeadId })
      });

      if (!response.ok) {
        throw new Error(`Failed to update project lead: ${response.status}`);
      }

      const responseData = await response.json();

      if (!responseData.success) {
        throw new Error(responseData.message || 'Failed to update project lead');
      }

      // Update local state with the complete review data
      if (responseData.data) {
        setReview(responseData.data);
        setNewLeadId(responseData.data.projectLeadId || '');
        toast.success('Project lead updated successfully');
      }

    } catch (err) {
      console.error('Error changing project lead:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update project lead');
    } finally {
      setIsChangingLead(false);
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
                {(isAuthor || isAdmin()) ? (
                  <div className="flex items-center space-x-2">
                    <select
                      value={currentStatus}
                      onChange={(e) => handleStatusChange(e.target.value as ReviewWithProfile['status'])}
                      disabled={isUpdating}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        currentStatus === 'Approved' ? 'bg-green-100 text-green-800' :
                        currentStatus === 'Needs Work' ? 'bg-yellow-100 text-yellow-800' :
                        currentStatus === 'In Review' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      } border-0 focus:ring-2 focus:ring-blue-500`}
                    >
                      <option value="Submitted">Submitted</option>
                      <option value="In Review">In Review</option>
                      <option value="Needs Work">Needs Work</option>
                      <option value="Approved">Approved</option>
                    </select>
                    {isUpdating && (
                      <span className="text-sm text-gray-500">Updating...</span>
                    )}
                  </div>
                ) : (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    review.status === 'Approved' ? 'bg-green-100 text-green-800' :
                    review.status === 'Needs Work' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {review.status}
                  </span>
                )}
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Project Lead:</span>
                  {isAdmin() ? (
                    <div className="flex items-center space-x-2">
                      <ProjectLeadSelector
                        value={review.projectLeadId || ''}
                        onChange={handleProjectLeadChange}
                        disabled={updatingLead}
                      />
                      {isChangingLead && (
                        <span className="text-sm text-gray-500">Updating...</span>
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
                          href={`https://leandata.mavenlink.com/workspaces/${review.kantataProjectId}?tab=project-workspace`}
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
                      <label className="block text-sm font-medium text-gray-700">OrgID</label>
                      <div className="mt-1 text-gray-900">
                        {review.orgId || 'Not Added'}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Customer Folder</label>
                      <div className="mt-1">
                        {review.customerFolder ? (
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
                        ) : (
                          <span className="text-gray-500">Not Added</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Handoff Link</label>
                      <div className="mt-1">
                        {review.handoffLink ? (
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
                        ) : (
                          <span className="text-gray-500">Not Added</span>
                        )}
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