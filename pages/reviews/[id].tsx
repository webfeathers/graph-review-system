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
import TaskList from '../../components/TaskList';

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
  const [hasInitialized, setHasInitialized] = useState(false);
  
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

      // Only fetch if we haven't initialized or if we're explicitly refreshing
      if (hasInitialized && review) {
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

        setHasInitialized(true);
      } catch (err) {
        console.error('Error fetching review:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch review');
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [id, user, authLoading, router, hasInitialized, review]);

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

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        const errorMessage = responseData.error || responseData.message || 'Failed to update status';
        toast.error(errorMessage, {
          duration: 5000,
          style: {
            background: '#FEE2E2',
            color: '#991B1B',
            padding: '16px',
            borderRadius: '8px',
            maxWidth: '500px'
          }
        });
        return;
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
      toast.error('Failed to update status');
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
    <div className="flex-grow container mx-auto px-4 py-0">
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
          {/* Status Section */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-4">
              {(isAuthor || isAdmin()) ? (
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-2 h-8">
                    <button
                      onClick={() => handleStatusChange('Draft')}
                      disabled={isUpdating || (!isAdmin() && !isAuthor)}
                      className={`inline-flex items-center justify-center w-[100px] h-8 rounded-full text-sm font-medium transition-colors duration-200 ${
                        currentStatus === 'Draft' 
                          ? 'bg-gray-100 text-gray-700' 
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {isUpdating && currentStatus === 'Draft' ? (
                        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : null}
                      Draft
                    </button>
                    <button
                      onClick={() => handleStatusChange('Submitted')}
                      disabled={isUpdating || (!isAdmin() && !isAuthor)}
                      className={`inline-flex items-center justify-center w-[100px] h-8 rounded-full text-sm font-medium transition-colors duration-200 ${
                        currentStatus === 'Submitted' 
                          ? 'bg-purple-600 text-white' 
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {isUpdating && currentStatus === 'Submitted' ? (
                        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : null}
                      Submitted
                    </button>
                    <button
                      onClick={() => handleStatusChange('In Review')}
                      disabled={isUpdating || !isAdmin()}
                      className={`inline-flex items-center justify-center w-[100px] h-8 rounded-full text-sm font-medium transition-colors duration-200 ${
                        currentStatus === 'In Review' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {isUpdating && currentStatus === 'In Review' ? (
                        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : null}
                      In Review
                    </button>
                    <button
                      onClick={() => handleStatusChange('Needs Work')}
                      disabled={isUpdating || !isAdmin()}
                      className={`inline-flex items-center justify-center w-[100px] h-8 rounded-full text-sm font-medium transition-colors duration-200 ${
                        currentStatus === 'Needs Work' 
                          ? 'bg-orange-500 text-white' 
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {isUpdating && currentStatus === 'Needs Work' ? (
                        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : null}
                      Needs Work
                    </button>
                    <button
                      onClick={() => handleStatusChange('Approved')}
                      disabled={isUpdating || !isAdmin()}
                      className={`inline-flex items-center justify-center w-[100px] h-8 rounded-full text-sm font-medium transition-colors duration-200 ${
                        currentStatus === 'Approved' 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {isUpdating && currentStatus === 'Approved' ? (
                        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : null}
                      Approved
                    </button>
                    <button
                      onClick={() => handleStatusChange('Archived')}
                      disabled={isUpdating || !isAdmin()}
                      className={`inline-flex items-center justify-center w-[100px] h-8 rounded-full text-sm font-medium transition-colors duration-200 ${
                        currentStatus === 'Archived' 
                          ? 'bg-gray-600 text-white' 
                          : 'bg-gray-50 text-gray-500 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
                      }`}
                    >
                      {isUpdating && currentStatus === 'Archived' ? (
                        <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : null}
                      Archived
                    </button>
                  </div>
                  <Link 
                    href="/help#review-process" 
                    className="text-gray-400 hover:text-gray-600 ml-2"
                    title="Learn more about review stages"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </Link>
                </div>
              ) : (
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  review.status === 'Approved' ? 'bg-green-100 text-green-800' :
                  review.status === 'Needs Work' ? 'bg-yellow-100 text-yellow-800' :
                  review.status === 'In Review' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {review.status}
                </span>
              )}
            </div>
          </div>

          {/* Status Guidance Notes */}
          {currentStatus === 'Needs Work' && (
            <div className="px-6 py-3 bg-orange-50 border-b border-orange-100">
              <div className="text-sm text-orange-700 flex items-center">
                <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>When the required fixes have been addressed, please reset the status to "Submitted"</span>
              </div>
            </div>
          )}
          {currentStatus === 'Draft' && (
            <div className="px-6 py-3 bg-orange-50 border-b border-orange-100">
              <div className="text-sm text-orange-700 flex items-center">
                <svg className="h-5 w-5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Review your information and when ready to begin the review process, set the status to "Submitted"</span>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-2">
                {(isAuthor || isAdmin()) && (
                  <Link
                    href={`/reviews/edit/${review.id}`}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                    title="Edit Review"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </Link>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{review.title}</h1>
                  <p className="mt-1 text-sm text-gray-500">
                    Created by {review.user?.email || 'Unknown'} on {new Date(review.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Project Lead Section */}
          <div className="px-6 py-4 border-b border-gray-200">
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

          {/* Main Content */}
          <div className="px-6 py-4">
            {/* Project Details Section */}
            <div className="mb-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-2">Description</h2>
                  <div className="prose max-w-none text-gray-900 text-sm mb-6">{review.description || 'Not Added'}</div>

                  <h2 className="text-lg font-medium text-gray-900 mb-2">Use Case</h2>
                  <div className="prose max-w-none text-gray-900 text-sm mb-6">{review.useCase || 'Not Added'}</div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <label className="w-1/3 text-sm font-medium text-gray-700">Account Name</label>
                        <div className="w-2/3 text-gray-900">{review.accountName || 'Not Added'}</div>
                      </div>

                      <div className="flex items-center">
                        <label className="w-1/3 text-sm font-medium text-gray-700">Kantata Project ID</label>
                        <div className="w-2/3">
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

                      <div className="flex items-center">
                        <label className="w-1/3 text-sm font-medium text-gray-700">OrgID</label>
                        <div className="w-2/3 text-gray-900">{review.orgId || 'Not Added'}</div>
                      </div>

                      <div className="flex items-center">
                        <label className="w-1/3 text-sm font-medium text-gray-700">Remote Access</label>
                        <div className="w-2/3 text-gray-900">{review.remoteAccess ? 'Yes' : 'No'}</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center">
                        <label className="w-1/3 text-sm font-medium text-gray-700">Segment</label>
                        <div className="w-2/3 text-gray-900">{review.segment || 'Not Added'}</div>
                      </div>

                      <div className="flex items-center">
                        <label className="w-1/3 text-sm font-medium text-gray-700">Graph Name</label>
                        <div className="w-2/3 text-gray-900">{review.graphName || 'Not Added'}</div>
                      </div>

                      <div className="flex items-center">
                        <label className="w-1/3 text-sm font-medium text-gray-700">Customer Folder</label>
                        <div className="w-2/3">
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

                      <div className="flex items-center">
                        <label className="w-1/3 text-sm font-medium text-gray-700">Sales to PS Handoff</label>
                        <div className="w-2/3">
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
                              Open Handoff Form
                            </a>
                          ) : (
                            <span className="text-gray-500">Not Added</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Section - Tasks and Comments */}
          <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Comments Section */}
              <div className="bg-white rounded-lg shadow-sm">
                <CommentSection
                  comments={review.comments || []}
                  reviewId={review.id}
                  onCommentAdded={(newComment) => {
                    setComments(prevComments => [...prevComments, newComment]);
                  }}
                />
              </div>

              {/* Tasks Section */}
              <div className="bg-white rounded-lg shadow-sm">
                <TaskList 
                  reviewId={review.id} 
                  reviewTitle={review.title} 
                  review={review}
                />
              </div>
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