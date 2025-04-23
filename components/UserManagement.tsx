// components/UserManagement.tsx
import React, { useState, useEffect } from 'react';
import { Profile, Role } from '../types/supabase';
import { Button } from './Button';
import { LoadingState } from './LoadingState';
import { ErrorDisplay } from './ErrorDisplay';
import { ProfileService } from '../lib/profileService';
import { supabase } from '../lib/supabase'; // Add this import

const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    setSuccessMessage(null);
    
    try {
      // Use ProfileService to get all profiles
      const profiles = await ProfileService.getAllProfiles();
      setUsers(profiles);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, role: Role) => {
    setError('');
    setSuccessMessage(null);
    setSavingUserId(userId);
    
    try {
      // Get current token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      // Call the API endpoint
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, role })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user role');
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update user role');
      }
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId ? { ...user, role } : user
      ));
      
      setSuccessMessage(`User role updated to ${role} successfully`);
    } catch (err: any) {
      console.error('Error updating user role:', err);
      setError(err.message || 'Failed to update user role');
    } finally {
      setSavingUserId(null);
    }
  };

  if (loading) {
    return <LoadingState message="Loading users..." />;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">User Management</h2>
      </div>
      
      {error && <ErrorDisplay error={error} onDismiss={() => setError('')} />}
      
      {successMessage && (
        <div className="bg-green-100 text-green-700 p-4 rounded-md mb-4 relative">
          <p>{successMessage}</p>
          <button 
            onClick={() => setSuccessMessage(null)}
            className="absolute top-2 right-2 text-green-700 hover:text-green-900"
            aria-label="Dismiss success message"
          >
            ×
          </button>
        </div>
      )}
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {user.name || 'Unnamed User'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{user.email || 'No email'}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {user.role || 'Member'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {user.role === 'Member' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => updateUserRole(user.id, 'Admin')}
                      isLoading={savingUserId === user.id}
                      disabled={savingUserId === user.id}
                    >
                      Make Admin
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => updateUserRole(user.id, 'Member')}
                      isLoading={savingUserId === user.id}
                      disabled={savingUserId === user.id}
                    >
                      Remove Admin
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          onClick={fetchUsers}
          className="text-blue-600"
        >
          Refresh
        </Button>
      </div>
    </div>
  );
};

export default UserManagement;