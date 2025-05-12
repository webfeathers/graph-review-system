import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/supabase';
import { ProfileService } from '../lib/profileService';
import Link from 'next/link';

const LeaderboardPage = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        // Get all profiles
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('name');

        if (error) {
          console.error('Error fetching profiles:', error);
          return;
        }

        // Calculate points for each profile using ProfileService
        const enrichedProfiles = await Promise.all(
          data.map(async (profile) => {
            const enrichedProfile = await ProfileService.ensureProfile({ id: profile.id });
            return enrichedProfile || profile;
          })
        );

        // Sort by points
        enrichedProfiles.sort((a, b) => (b.points || 0) - (a.points || 0));
        setProfiles(enrichedProfiles);
      } catch (error) {
        console.error('Error in leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Leaderboard</h1>
      <table className="min-w-full bg-white border rounded-lg overflow-hidden">
        <thead className="bg-gray-50">
          <tr>
            <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">Rank</th>
            <th className="py-3 px-4 text-left text-sm font-medium text-gray-500">User</th>
            <th className="py-3 px-4 text-center text-sm font-medium text-gray-500">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {profiles.map((profile, index) => (
            <tr 
              key={profile.id} 
              className="hover:bg-gray-50"
            >
              <td className="py-3 px-4 text-sm text-gray-900">{index + 1}</td>
              <td className="py-3 px-4 text-sm text-gray-900">
                <Link 
                  href={`/profile/${profile.id}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {profile.name}
                </Link>
              </td>
              <td className="py-3 px-4 text-sm text-gray-900 text-center">{profile.points ?? 0}</td>
            </tr>
          ))}
          {profiles.length === 0 && (
            <tr>
              <td colSpan={3} className="py-4 px-4 text-sm text-gray-500 text-center">
                No users found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default LeaderboardPage; 