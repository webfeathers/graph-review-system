// components/ProjectLeadSelector.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Profile } from '../types/supabase';

interface ProjectLeadSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

const ProjectLeadSelector: React.FC<ProjectLeadSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
}) => {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('id, name, email, role, created_at')
          .order('name');
          
        if (error) {
          throw error;
        }
        
        setUsers(data.map(user => ({
          id: user.id,
          name: user.name || 'Unnamed User',
          email: user.email || '',
          createdAt: user.created_at,
          role: user.role
        })));
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);

  if (loading) {
    return (
      <select 
        disabled 
        className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-400 ${className}`}
      >
        <option>Loading users...</option>
      </select>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 text-sm">{error}</div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${className}`}
    >
      <option value="">Select Project Lead</option>
      {users.map((user) => (
        <option key={user.id} value={user.id}>
          {user.name} ({user.email})
        </option>
      ))}
    </select>
  );
};

export default ProjectLeadSelector;