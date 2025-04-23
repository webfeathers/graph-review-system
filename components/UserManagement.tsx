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

  // Rest of your component remains the same
  // ...

  return (
    // Your JSX remains the same
    // ...
  );
};

export default UserManagement;