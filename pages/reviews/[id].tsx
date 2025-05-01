// pages/reviews/[id].tsx
import type { NextPage } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import CommentSection from '../../components/commentSection';
import { useAuth } from '../../components/AuthProvider';
import { getReviewById, updateReviewStatus, getCommentsByReviewId } from '../../lib/supabaseUtils';
import { ReviewWithProfile, CommentWithProfile } from '../../types/supabase';
import { LoadingState } from '../../components/LoadingState';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { supabase } from '../../lib/supabase';

const ReviewPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading, isAdmin } = useAuth();
  const [review, setReview] = useState<ReviewWithProfile | null>(null);
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [isAuthor, setIsAuthor] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<ReviewWithProfile['status']>();
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!id) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const reviewData = await getReviewById(id as string);
        setReview(reviewData);
        setCurrentStatus(reviewData.status);
        setIsAuthor(reviewData.userId === user.id);

        const commentsData = await getCommentsByReviewId(id as string);
        setComments(commentsData);
      } catch (error) {
        console.error('Error fetching review data:', error);
        setError(error instanceof Error ? error.message : 'Failed to load review data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, authLoading, router]);

  const handleStatusChange = async (newStatus: ReviewWithProfile['status']) => {
    if (!user || !review || newStatus === currentStatus || isUpdating) return;
    
    // Only allow admins to set the Approved status
    if (newStatus === 'Approved' && !isAdmin()) {
      setError('Only administrators can approve reviews');
      return;
    }
    
    setIsUpdating(true);
    try {
      // Get current token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      // First, update the status in your system
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update status');
      }
      
      // After successful update, call the Kantata update API if we have a Kantata ID
      if (review.kantataProjectId) {
        try {
          const kantataResponse = await fetch('/api/kantata/update-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              kantataProjectId: review.kantataProjectId,
              status: newStatus
            })
          });
          
          if (!kantataResponse.ok) {
            // Log but don't fail completely if Kantata update fails
            const kantataError = await kantataResponse.json();
            console.error('Kantata update failed:', kantataError);
          } else {
            console.log('Kantata status updated successfully');
          }
        } catch (kantataError) {
          // Log but don't fail completely
          console.error('Error updating Kantata:', kantataError);
        }
      }
      
      setCurrentStatus(newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
      setError(error instanceof Error ? error.message : 'Failed to update status');
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading || loading) {
    return <Layout><LoadingState message="Loading review..." /></Layout>;
  }

  if (error) {
    return (
      <Layout>
        <ErrorDisplay 
          error={error} 
          onDismiss={() => setError(null)} 
          className="mb-6"
        />
        <div className="flex justify-center">
          <a 
            href="/reviews" 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Reviews
          </a>
        </div>
      </Layout>
    );
  }

  if (!review) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-4">Review Not Found</h2>
          <p className="text-gray-600 mb-6">The review you're looking for doesn't exist or has been removed.</p>
          <a 
            href="/reviews" 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Back to Reviews
          </a>
        </div>
      </Layout>
    );
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
                <a 
                  href={`/reviews/edit/${review.id}`}
                  className="bg-gray-200 text-gray-700 p-2 rounded-full hover:bg-gray-300"
                  title="Edit Review"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </a>
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
          
          <div className="text-sm text-gray-500 mb-4">
            <p>Submitted by {review.user.name} on {new Date(review.createdAt).toLocaleDateString()}</p>
            <p>Last updated: {new Date(review.updatedAt).toLocaleDateString()}</p>
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
            
            <div className="mt-4">
              {review.graphImageUrl ? (
                <img 
                  src={review.graphImageUrl} 
                  alt="Graph visualization" 
                  className="max-w-full rounded"
                />
              ) : (
                <div className="bg-gray-100 p-4 rounded text-center text-gray-500">
                  No graph image uploaded
                </div>
              )}
            </div>
          </div>
          
          <CommentSection 
            comments={comments.map(c => ({
              id: c.id,
              content: c.content,
              reviewId: c.reviewId,
              userId: c.userId,
              createdAt: c.createdAt, // Already a string, no need to convert
              user: {
                id: c.user.id,
                name: c.user.name,
                email: c.user.email,
                password: '',
                createdAt: c.user.createdAt, // Already a string, no need to convert
                role: c.user.role || 'user' // Add the missing role property
              }
            }))} 
            reviewId={review.id} 
          />

          <div className="mt-8 text-center">
            <a 
              href="/reviews" 
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
            >
              Back to All Reviews
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ReviewPage;