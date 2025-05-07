import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import { LoadingState, ErrorDisplay, useAuth, withRoleProtection } from '../../components';
import { getProfileById } from '../../lib/api';
import type { Profile } from '../../types/supabase';
import { ProfileService } from '../../lib/profileService';
import { supabase } from '../../lib/supabase';
import { POINTS_PER_REVIEW, POINTS_PER_COMMENT, BADGE_THRESHOLDS } from '../../constants';

const ProfilePage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedProfile = useRef(false);

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
        const badges = BADGE_THRESHOLDS
          .filter(({ threshold }) => points >= threshold)
          .map(({ badge }) => badge);

        // Update profile with calculated values
        setProfile({
          ...fetchedProfile,
          reviewCount: reviewsCountValue,
          commentCount: commentsCountValue,
          points,
          badges
        });
        hasLoadedProfile.current = true;
      } catch (err) {
        console.error('Error loading profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router.isReady, authLoading, user, id]);

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
    <div className="max-w-md mx-auto py-8">
      <div className="flex items-center space-x-4 mb-6">
        {profile.avatarUrl ? (
          <img 
            src={profile.avatarUrl} 
            alt={`${profile.name}'s avatar`}
            className="w-16 h-16 rounded-full object-cover"
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
      <div className="bg-white p-6 rounded-lg shadow">
        <p><strong>Name:</strong> {profile.name}</p>
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Role:</strong> {profile.role}</p>
        <p><strong>Joined:</strong> {new Date(profile.createdAt).toLocaleDateString()}</p>
        <p><strong>Reviews:</strong> {profile.reviewCount ?? 0}</p>
        <p><strong>Comments:</strong> {profile.commentCount ?? 0}</p>
        <p><strong>Points:</strong> {profile.points ?? 0}</p>
        {profile.badges && profile.badges.length > 0 && (
          <div className="mt-4">
            <h2 className="text-xl font-semibold">Badges</h2>
            <div className="flex flex-wrap gap-2 mt-2">
              {profile.badges.map(badge => (
                <span key={badge} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">{badge}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Wrap the page with withRoleProtection to ensure proper role checks
export default withRoleProtection(ProfilePage, ['Member', 'Admin']); 