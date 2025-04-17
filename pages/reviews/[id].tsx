// pages/reviews/[id].tsx
import type { NextPage, GetServerSideProps } from 'next';
import { useSession, getSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useState } from 'react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import CommentSection from '../../components/CommentSection';
import { Review } from '../../models/Review';
import { Comment } from '../../models/Comment';
import { User } from '../../models/User';

interface ReviewPageProps {
  review: Review & { user: User };
  comments: (Comment & { user: User })[];
  isAuthor: boolean;
}

const ReviewPage: NextPage<ReviewPageProps> = ({ review, comments, isAuthor }) => {
  const { status } = useSession();
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState<Review['status']>(review.status);
  const [isUpdating, setIsUpdating] = useState(false);

  if (status === 'unauthenticated') {
    router.push('/login');
    return null;
  }

  const handleStatusChange = async (newStatus: Review['status']) => {
    if (newStatus === currentStatus) return;
    
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      setCurrentStatus(newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-3xl font-bold">{review.title}</h1>
            <StatusBadge status={currentStatus} />
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
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <CommentSection comments={comments} reviewId={review.id} />
        </div>
      </div>
    </Layout>
  );
};

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { id } = context.params as { id: string };
  const session = await getSession(context);

  if (!session) {
    return {
      redirect: {
        destination: '/login',
        permanent: false,
      },
    };
  }

  // Fetch the review data from our API
  const reviewResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/reviews/${id}`);
  
  if (!reviewResponse.ok) {
    return {
      notFound: true,
    };
  }
  
  const review = await reviewResponse.json();
  
  // Fetch comments for this review
  const commentsResponse = await fetch(`${process.env.NEXTAUTH_URL}/api/comments?reviewId=${id}`);
  const comments = commentsResponse.ok ? await commentsResponse.json() : [];

  // Get user data for the review author
  // In a real app, you'd fetch this from your database
  const user = {
    id: review.userId,
    name: "User " + review.userId,
    email: "user" + review.userId + "@example.com",
    password: '',
    createdAt: new Date(),
  };

  // Add user data to each comment
  const commentsWithUsers = comments.map((comment: Comment) => ({
    ...comment,
    user: {
      id: comment.userId,
      name: "User " + comment.userId,
      email: "user" + comment.userId + "@example.com",
      password: '',
      createdAt: new Date(),
    },
  }));

  // Check if the current user is the author
  const isAuthor = review.userId === session.user.id;

  return {
    props: {
      review: {
        ...review,
        user,
      },
      comments: commentsWithUsers,
      isAuthor,
    },
  };
};

export default ReviewPage;