// pages/dashboard.tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';

// Components and Hooks
import { 
  GraphReviewCard, 
  LoadingState, 
  EmptyState,
  useAuth
} from '../components';
import ActivityFeed from '../components/ActivityFeed';

// API
import { getReviews } from '../lib/api';
import { supabase } from '../lib/supabase';

// Types
import { ReviewWithProfile } from '../types/supabase';

// Interface for review with comment count
interface ReviewWithCommentCount extends ReviewWithProfile {
  commentCount: number;
}

const Dashboard: NextPage = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewWithCommentCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Redirect to login if not authenticated
      router.push('/login');
      return;
    }

    // Fetch reviews and activities
    const fetchData = async () => {
      try {
        // Get the user's reviews
        const reviewsData = await getReviews(user.id);
        
        // Filter out reviews with 'Approved' status
        const activeReviews = reviewsData.filter(review => review.status !== 'Approved');
        
        // For each review, fetch comment count
        const reviewsWithCounts = await Promise.all(
          activeReviews.map(async (review) => {
            // Query to count comments for this review
            const { count, error } = await supabase
              .from('comments')
              .select('id', { count: 'exact', head: true })
              .eq('review_id', review.id);
              
            return {
              ...review,
              commentCount: count || 0
            };
          })
        );
        
        setReviews(reviewsWithCounts);

        // Fetch recent activities
        const { data: recentActivities, error: activitiesError } = await supabase
          .from('activities')
          .select(`
            *,
            user:profiles!user_id(id, name, email),
            review:reviews!activities_review_id_fkey(id, title),
            task:tasks(id, title),
            comment:comments(id, content)
          `)
          .order('created_at', { ascending: false })
          .limit(10);

        if (activitiesError) throw activitiesError;
        setActivities(recentActivities || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, authLoading, router]);

  if (authLoading || loading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  if (!user) return null;

  return (
    <>
      <div className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-gray-600">Welcome back, {profile?.name || user.user_metadata?.name || user.email}!</p>
          </div>
          
          {/* Stats and Badges Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 w-64">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <h3 className="text-sm font-medium text-gray-900">Points</h3>
                <Link
                  href="/help#points-system"
                  className="ml-1.5 text-gray-400 hover:text-gray-600"
                  title="Learn more about points"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </Link>
              </div>
              <span className="text-xl font-bold text-blue-600">{profile?.points ?? 0}</span>
            </div>
            
            {profile?.badges && profile.badges.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {profile.badges.map((badge) => (
                  <span 
                    key={badge} 
                    className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center"
                  >
                    <svg className="w-3 h-3 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    {badge}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-xs">No badges earned yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
          <ActivityFeed activities={activities} />
        </div>

        {/* Active Graph Reviews Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Your Active Graph Reviews</h2>
            <Link
              href="/reviews/new"
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            >
              New Review
            </Link>
          </div>
          {reviews.length === 0 ? (
            <p className="text-gray-500">No active reviews</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <GraphReviewCard
                  key={review.id}
                  review={review}
                  commentCount={review.commentCount}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Dashboard;