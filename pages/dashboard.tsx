// pages/dashboard.tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

// Components and Hooks
import { 
  GraphReviewCard, 
  LoadingState, 
  EmptyState,
  useAuth
} from '../components';
import ActivityFeed from '../components/ActivityFeed';
import BadgeDisplay from '../components/BadgeDisplay';

// API
import { getReviews } from '../lib/api';
import { supabase } from '../lib/supabase';

// Types
import { ReviewWithProfile, dbToFrontendProfile, dbToFrontendReview } from '../types/supabase';
import { ProfileService } from '../lib/profileService';

// Interface for review with comment count
interface ReviewWithCommentCount extends ReviewWithProfile {
  commentCount: number;
  reviewType: 'customer' | 'template';
  fileLink?: string;
}

// Minimal Leaderboard component for dashboard
function MinimalLeaderboard({ currentUserId }: { currentUserId: string }) {
  const [topUsers, setTopUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopUsers = async () => {
      // Get all profiles first (like the full leaderboard page)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name');
      
      if (!error && data) {
        // Calculate points for each profile using ProfileService (like the full leaderboard page)
        const enriched = await Promise.all(
          data.map(async (profile) => {
            const enrichedProfile = await ProfileService.ensureProfile({ id: profile.id });
            return enrichedProfile || profile;
          })
        );
        // Sort by points and take top 5
        enriched.sort((a, b) => (b.points || 0) - (a.points || 0));
        setTopUsers(enriched.slice(0, 5));
      }
      setLoading(false);
    };
    fetchTopUsers();
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 flex flex-col items-start min-w-[360px] border border-gray-200 bg-gray-50 mr-6">
      <div className="font-semibold text-gray-700 mb-2 flex items-center">
        <span className="mr-2">🏆</span> Leaderboard
      </div>
      <ol className="space-y-1 w-full">
        {topUsers.map((user, idx) => (
          <li
            key={user.id}
            className={`flex items-center text-sm rounded px-1 py-0.5 w-full ${user.id === currentUserId ? 'bg-blue-100 font-bold text-blue-700' : ''}`}
          >
            <span className="font-bold mr-2 text-gray-500">{idx + 1}.</span>
            <span className="mr-2 bg-gray-200 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
              {user.name?.charAt(0) || '?'}
            </span>
            <span className="mr-2 truncate max-w-[200]" title={user.name}>
              <Link href={`/profile/${user.id}`} className="text-blue-600 hover:underline">{user.name}</Link>
            </span>
            <span className="text-xs text-gray-400 ml-auto">{user.points ?? 0} pts</span>
          </li>
        ))}
      </ol>
      <Link href="/leaderboard" className="text-sm text-blue-600 hover:text-blue-800 mt-3 self-start">View Full Leaderboard</Link>
    </div>
  );
}

const Dashboard: NextPage = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewWithCommentCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string; email: string }[]>([]);
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
          .select('id, name, email')
          .order('name');

        if (usersError) throw usersError;
        setUsers(usersData || []);

        // Get the user's reviews
        const reviewsData = await getReviews(user.id);
        
        // Filter reviews based on status and archived state
        const filteredReviews = reviewsData.filter(review => {
          // Only filter out archived reviews unless showArchived is true
          if (!showArchived && review.status === 'Archived') return false;
          // Apply status filter
          if (filter !== 'All' && review.status !== filter) return false;
          return true;
        });
        
        // For each review, fetch comment count
        try {
          const reviewsWithCounts = await Promise.all(
            filteredReviews.map(async (review: any) => {
              try {
                const { count, error } = await supabase
                  .from('comments')
                  .select('id', { count: 'exact', head: true })
                  .eq('review_id', review.id);
                
                if (error) return null;
                
                const { data: userData } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', review.userId)
                  .single();

                const { data: projectLeadData } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', review.projectLeadId)
                  .single();
                
                const transformedReview: ReviewWithCommentCount = {
                  id: review.id,
                  title: review.title,
                  description: review.description,
                  status: review.status,
                  userId: review.userId,
                  projectLeadId: review.projectLeadId,
                  createdAt: review.createdAt,
                  updatedAt: review.updatedAt,
                  user: userData ? {
                    id: userData.id,
                    name: userData.name,
                    email: userData.email,
                    createdAt: userData.created_at,
                    role: userData.role
                  } : {
                    id: review.userId,
                    name: 'Unknown User',
                    email: '',
                    createdAt: new Date().toISOString(),
                    role: 'Member'
                  },
                  projectLead: projectLeadData ? {
                    id: projectLeadData.id,
                    name: projectLeadData.name,
                    email: projectLeadData.email,
                    createdAt: projectLeadData.created_at,
                    role: projectLeadData.role
                  } : undefined,
                  commentCount: count || 0,
                  reviewType: (review as any).reviewType ?? 'customer',
                  fileLink: (review as any).fileLink ?? undefined,
                };
                
                return transformedReview;
              } catch (error) {
                return null;
              }
            })
          );
          
          const validReviews = reviewsWithCounts.filter((review): review is ReviewWithCommentCount => review !== null);
          setReviews(validReviews);
        } catch (error) {
          setReviews([]);
        }
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-gray-600">Welcome back, {profile?.name || user.user_metadata?.name || user.email}!</p>
          </div>
          <div className="flex items-start">
            <MinimalLeaderboard currentUserId={user.id} />
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
                <div className="flex flex-wrap gap-2">
                  {profile.badges.map((badge) => (
                    <BadgeDisplay key={badge} badge={badge} size="sm" />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-xs">No badges earned yet</p>
              )}
            </div>
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
            <ActivityFeed activities={activities} allUsers={users} />
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
          <div className="flex items-center space-x-4 mb-4">
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