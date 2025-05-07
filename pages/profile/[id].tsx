import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { LoadingState, ErrorDisplay, useAuth, withRoleProtection } from '../../components';
import { getProfileById } from '../../lib/api';
import type { Profile } from '../../types/supabase';
import { ProfileService } from '../../lib/profileService';

const ProfilePage: NextPage = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady) return;
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    const loadProfile = async () => {
      setLoading(true);
      try {
        // Force a refresh of the profile data
        const freshProfile = await ProfileService.forceRefreshProfile(id as string);
        setProfile(freshProfile);
      } catch (err) {
        console.error('Error loading profile:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch profile');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [router.isReady, authLoading, user, id, router]);

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