import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/supabase';

const LeaderboardPage = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('points', { ascending: false });

      if (error) {
        console.error('Error fetching profiles:', error);
      } else {
        setProfiles(data);
      }
      setLoading(false);
    };

    fetchProfiles();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Leaderboard</h1>
      <table className="min-w-full bg-white">
        <thead>
          <tr>
            <th className="py-2 text-left">Rank</th>
            <th className="py-2 text-left">User</th>
            <th className="py-2">Points</th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile, index) => (
            <tr key={profile.id} className="border-t">
              <td className="py-2">{index + 1}</td>
              <td className="py-2">{profile.email}</td>
              <td className="py-2 text-center">{profile.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LeaderboardPage; 