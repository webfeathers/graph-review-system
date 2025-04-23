// pages/reviews/[id].tsx
import type { NextPage } from 'next';
import Link from 'next/link';  // Make sure this is imported correctly
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import CommentSection from '../../components/CommentSection';
import { useAuth } from '../../components/AuthProvider';
import { getReviewById, updateReviewStatus, getCommentsByReviewId } from '../../lib/supabaseUtils';
import { ReviewWithProfile, CommentWithProfile } from '../../types/supabase';
import { LoadingState } from '../../components/LoadingState';

const ReviewPage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();
  const [review, setReview] = useState<ReviewWithProfile | null>(null);
  const [comments, setComments] = useState<CommentWithProfile[]>([]);
  const [isAuthor, setIsAuthor] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<ReviewWithProfile['status']>();
  const [isUpdating, setIsUpdating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!id) return;

    const fetchData = async () => {
      try {
        const reviewData = await getReviewById(id as string);
        setReview(reviewData);
        setCurrentStatus(reviewData.status);
        setIsAuthor(reviewData.userId === user.id);

        const commentsData = await getCommentsByReviewId(id as string);
        setComments(commentsData);
      } catch (error) {
        console.error('Error fetching review data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user, authLoading, router]);

  const handleStatusChange = async (newStatus: ReviewWithProfile['status']) => {
    if (!user || !review || newStatus === currentStatus) return;
    
    setIsUpdating(true);
    try {
      await updateReviewStatus(review.id, newStatus, user.id);
      setCurrentStatus(newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (authLoading || loading || !review) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        {/* Basic navigation links that should definitely work */}
        <div className="mb-4 flex space-x-4">
          <Link href="/dashboard" legacyBehavior>
            <a className="text-blue-500 hover:underline">Dashboard</a>
          </Link>
          <Link href="/reviews" legacyBehavior>
            <a className="text-blue-500 hover:underline">All Reviews</a>
          </Link>
        </div>
        
        <div className="mb-8">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-3xl font-bold">{review.title}</h1>
            <StatusBadge status={currentStatus || review.status} />
          </div>
          
          <div className="text-sm text-gray-500 mb-4">
            <p>Submitted by {review.user.name} on {new Date(review.createdAt).toLocaleDateString()}</p>
            <p>Last updated: {new Date(review.updatedAt).toLocaleDateString()}</p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
            <p className="mb-6">{review.description}</p>
            
            {review.graphImageUrl && (
              <div className="mt-4">
                <img 
                  src={review.graphImageUrl} 
                  alt="Graph visualization" 
                  className="max-w-full rounded"
                />
              </div>
            )}
          </div>
          
          {isAuthor && (
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-medium mb-3">Update Status</h3>
              <div className="flex flex-wrap gap-2">
                {(['Submitted', 'In Review', 'Needs Work', 'Approved'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    disabled={status === currentStatus || isUpdating}
                    className={`px-4 py-2 rounded ${
                      status === currentStatus
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                    } disabled:opacity-50`}
                    type="button"
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <CommentSection 
            comments={comments.map(c => ({
              id: c.id,
              content: c.content,
              reviewId: c.reviewId,
              userId: c.userId,
              createdAt: new Date(c.createdAt),
              user: {
                id: c.user.id,
                name: c.user.name,
                email: c.user.email,
                password: '',
                createdAt: new Date(c.user.createdAt)
              }
            }))} 
            reviewId={review.id} 
          />
        </div>
        
        {/* Simple navigation link at the bottom */}
        <div className="mt-6 text-center">
          <a 
            href="/reviews" 
            className="inline-block px-4 py-2 bg-blue-500 text-white rounded"
          >
            Back to Reviews (regular anchor)
          </a>
        </div>
      </div>
    </Layout>
  );
};

export default ReviewPage;