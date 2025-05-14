import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { LoadingState, ErrorDisplay, useAuth, withRoleProtection, ActivityFeed } from '../../components';
import { getProfileById } from '../../lib/api';
import type { Profile } from '../../types/supabase';
import { ProfileService } from '../../lib/profileService';
import { supabase } from '../../lib/supabase';
import { POINTS_PER_REVIEW, POINTS_PER_COMMENT, BADGE_THRESHOLDS } from '../../constants';
import BadgeDisplay from '../../components/BadgeDisplay';
import { BadgeType } from '../../constants';
import Link from 'next/link';
import { InformationCircleIcon } from '@heroicons/react/24/outline';

const ProfilePage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedProfile = useRef(false);
  const [allUsers, setAllUsers] = useState<{id: string; name: string; email: string}[]>([]);

  // Get avatar URL from user metadata
  useEffect(() => {
    const fetchAvatar = async () => {
      if (profile?.email) {
        try {
          // Get user metadata from Supabase auth
          const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            throw userError;
          }

          // Get the avatar URL from user metadata
          const googleAvatar = authUser?.user_metadata?.picture;
          
          if (googleAvatar) {
            // Use a proxy endpoint to handle the image
            const proxyUrl = `/api/proxy-avatar?url=${encodeURIComponent(googleAvatar)}`;
            setAvatarUrl(proxyUrl);
          }
        } catch (error) {
          console.error('Error fetching avatar:', error);
        }
      }
    };

    fetchAvatar();
  }, [profile]);

  useEffect(() => {
    console.log('Avatar URL state changed:', avatarUrl);
  }, [avatarUrl]);

  useEffect(() => {
    if (!router.isReady || authLoading || !user || !id || hasLoadedProfile.current) return;

    const loadProfile = async () => {
      setLoading(true);
      try {
        // Use getBulkProfiles to fetch any user's profile
        const profiles = await ProfileService.getBulkProfiles([id as string]);
        const fetchedProfile = profiles[id as string];
        if (!fetchedProfile) {
          throw new Error('Profile not found');
        }

        // Calculate review and comment counts
        const { count: reviewCount } = await supabase
          .from('reviews')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', id);
        const { count: commentCount } = await supabase
          .from('comments')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', id);

        const reviewsCountValue = reviewCount || 0;
        const commentsCountValue = commentCount || 0;
        const points = reviewsCountValue * POINTS_PER_REVIEW + commentsCountValue * POINTS_PER_COMMENT;

        // Get additional metrics for badges
        const [
          { count: approvedReviewCount },
          { data: helpfulVotes },
          { data: firstComments },
          { data: uniqueReviews },
          { data: userCreatedAt }
        ] = await Promise.all([
          supabase
            .from('reviews')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', id)
            .eq('status', 'Approved'),
          supabase
            .from('comment_votes')
            .select('comment_id')
            .eq('user_id', id)
            .eq('is_helpful', true),
          supabase
            .from('comments')
            .select('review_id')
            .eq('user_id', id)
            .order('created_at', { ascending: true }),
          supabase
            .from('reviews')
            .select('id')
            .eq('user_id', id),
          supabase
            .from('profiles')
            .select('created_at')
            .eq('id', id)
            .single()
        ]);

        const approvedReviewsCountValue = approvedReviewCount || 0;
        const helpfulVotesCount = helpfulVotes?.length || 0;
        const firstCommentsCount = firstComments?.length || 0;
        const uniqueReviewsCount = uniqueReviews?.length || 0;
        const monthsActive = userCreatedAt ? 
          Math.floor((Date.now() - new Date(userCreatedAt.created_at).getTime()) / (30 * 24 * 60 * 60 * 1000)) : 0;

        // Calculate badges based on different metrics
        const badges = BADGE_THRESHOLDS
          .filter(({ type, threshold, category }) => {
            switch (category) {
              case 'points':
                return points >= threshold;
              case 'reviews':
                switch (type) {
                  case 'Review Master':
                    return reviewsCountValue >= threshold;
                  case 'Quality Reviewer':
                    return approvedReviewsCountValue >= threshold;
                  case 'Helpful Reviewer':
                    return helpfulVotesCount >= threshold;
                  default:
                    return false;
                }
              case 'comments':
                switch (type) {
                  case 'Engaged Commenter':
                    return commentsCountValue >= threshold;
                  case 'Insightful Commenter':
                    return helpfulVotesCount >= threshold;
                  default:
                    return false;
                }
              case 'special':
                switch (type) {
                  case 'Early Adopter':
                    return monthsActive >= 1; // Joined in first month
                  case 'Team Player':
                    return uniqueReviewsCount >= threshold;
                  case 'Consistent Contributor':
                    return monthsActive >= threshold;
                  case 'Ice Breaker':
                    return firstCommentsCount >= threshold;
                  default:
                    return false;
                }
              default:
                return false;
            }
          })
          .map(({ type }) => type);

        // Update profile with calculated values
        const updatedProfile = {
          ...fetchedProfile,
          reviewCount: reviewsCountValue,
          commentCount: commentsCountValue,
          points,
          badges
        };
        console.log('Setting profile:', updatedProfile);
        setProfile(updatedProfile);

        // Fetch activities for this user
        const { data: userActivities, error: activitiesError } = await supabase
          .from('activities')
          .select(`
            id,
            type,
            review_id,
            task_id,
            comment_id,
            created_at,
            metadata,
            user:profiles!activities_user_id_fkey(id, name, role, email, points, created_at),
            review:reviews!activities_review_id_fkey(id, title)
          `)
          .eq('user_id', id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (activitiesError) throw activitiesError;
        setActivities(userActivities || []);

        hasLoadedProfile.current = true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router.isReady, authLoading, user, id]);

  useEffect(() => {
    const loadUsers = async () => {
      const { data } = await supabase.from('profiles').select('id, name, email');
      setAllUsers(data || []);
    };
    loadUsers();
  }, []);

  // Handle authentication redirect
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  if (authLoading || loading || !profile) {
    return <LoadingState message="Loading profile..." />;
  }

  if (error || !profile) {
    return <ErrorDisplay error={error ?? 'Profile not found'} />;
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center space-x-4 mb-6">
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={`${profile.name}'s avatar`}
            className="w-16 h-16 rounded-full object-cover"
            onError={() => setAvatarUrl('')}
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-2xl text-gray-500">
              {profile.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <h1 className="text-3xl font-bold">{profile.name}</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Info */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow">
            <p><strong>Role:</strong> {profile.role}</p>
            <p><strong>Joined:</strong> {new Date(profile.createdAt).toLocaleDateString()}</p>
            <p><strong>Reviews:</strong> {profile.reviewCount ?? 0}</p>
            <p><strong>Comments:</strong> {profile.commentCount ?? 0}</p>
            <p><strong>Points:</strong> {profile.points ?? 0}</p>
            {profile.badges && profile.badges.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Badges</h2>
                  <Link href="/help#badges" className="text-gray-400 hover:text-gray-600">
                    <InformationCircleIcon className="w-5 h-5" />
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {profile.badges.map((badge: BadgeType) => (
                    <BadgeDisplay key={badge} badge={badge} size="md" />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Activities */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <ActivityFeed activities={activities} allUsers={allUsers} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrap the page with withRoleProtection to ensure proper role checks
export default withRoleProtection(ProfilePage, ['Member', 'Admin']); 