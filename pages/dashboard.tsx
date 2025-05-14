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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [filter, setFilter] = useState('All');

  // Initial data load
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // Redirect to login if not authenticated
      router.push('/login');
      return;
    }

    // Set initial selected user to current user
    setSelectedUserId(user.id);

    // Fetch initial data
    const fetchInitialData = async () => {
      try {
        // Get all users for the filter
        const { data: usersData, error: usersError } = await supabase
          .from('profiles')
          .select('id, name')
          .order('name');

        if (usersError) throw usersError;
        setUsers(usersData || []);

        // Get the user's reviews
        const reviewsData = await getReviews(user.id);
        
        // Filter reviews based on status and archived state
        const filteredReviews = reviewsData.filter(review => {
          if (review.status === 'Approved') return false;
          if (!showArchived && review.status === 'Archived') return false;
          return true;
        });
        
        // For each review, fetch comment count
        const reviewsWithCounts = await Promise.all(
          filteredReviews.map(async (review) => {
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
      } catch (error) {
        // Error is handled by the UI state
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user, authLoading, router, showArchived, filter]);

  // Separate effect for activities
  useEffect(() => {
    if (!user) return;

    const fetchActivities = async () => {
      setLoadingActivities(true);
      try {
        let query = supabase
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

        // Filter by selected user if not showing all users
        if (selectedUserId) {
          query = query.eq('user_id', selectedUserId);
        }

        const { data: recentActivities, error: activitiesError } = await query;

        if (activitiesError) throw activitiesError;
        setActivities(recentActivities || []);
      } catch (error) {
        // Error is handled by the UI state
      } finally {
        setLoadingActivities(false);
      }
    };

    fetchActivities();
  }, [selectedUserId, user]);

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
          <div className="bg-white rounded-lg shadow-sm p-4 w-64 border border-gray-200 bg-gray-50">
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
            <a href="/leaderboard" className="text-sm text-blue-600 hover:text-blue-800 mt-2 block">View Leaderboard</a>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          {/* Status Filter */}
          <div>
            <label htmlFor="statusFilter" className="mr-2 text-sm font-medium">Filter:</label>
            <select
              id="statusFilter"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="border px-2 py-1 rounded"
            >
              <option value="All">All</option>
              <option value="Submitted">Submitted</option>
              <option value="In Review">In Review</option>
              <option value="Needs Work">Needs Work</option>
              <option value="Approved">Approved</option>
              {showArchived && <option value="Archived">Archived</option>}
            </select>
          </div>
          {/* Show Archived Toggle */}
          <div className="flex items-center">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">Show Archived</span>
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Recent Activity</h2>
            <div className="flex items-center space-x-2">
              <select
                value={selectedUserId || ''}
                onChange={(e) => setSelectedUserId(e.target.value || null)}
                className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[150px]"
                disabled={loadingActivities}
              >
                <option value="">All Users</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.id === selectedUserId ? `✓ ${user.name}` : user.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {loadingActivities ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
            </div>
          ) : (
            <ActivityFeed activities={activities} />
          )}
        </div>

        {/* Active Graph Reviews Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold">Your Active Graph Reviews</h2>
            <div className="flex items-center space-x-4">
              <Link
                href="/reviews/new"
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              >
                New Review
              </Link>
            </div>
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