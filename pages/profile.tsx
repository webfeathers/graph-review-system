import type { NextPage } from 'next';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Layout, LoadingState, useAuth } from '../components';
import { ProfileService } from '../lib/profileService';

const ProfilePage: NextPage = () => {
  const { profile, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [authLoading, user, router]);

  const handleRefresh = async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      await ProfileService.forceRefreshProfile(user.id);
      // Force a page reload to get fresh data
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing profile:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Show loading state while auth/profile is loading
  if (authLoading || !profile) {
    return <LoadingState message="Loading profile..." />;
  }

  return (
    <Layout>
      <div className="max-w-md mx-auto py-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">My Profile</h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {refreshing ? 'Refreshing...' : 'Refresh Profile'}
          </button>
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
    </Layout>
  );
};

export default ProfilePage; 