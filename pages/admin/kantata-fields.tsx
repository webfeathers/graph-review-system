// pages/admin/kantata-fields.tsx
import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { withRoleProtection } from '../../components/withRoleProtection';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { LoadingState } from '../../components/LoadingState';
import { ErrorDisplay } from '../../components/ErrorDisplay';

const KantataFieldsPage = () => {
  const [fields, setFields] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchFields() {
      try {
        setLoading(true);
        setError(null);
        
        // Get auth token
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        
        if (!token) {
          throw new Error('No authentication token available');
        }
        
        // Call your API endpoint
        const response = await fetch('/api/kantata/list-fields', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `API error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch Kantata fields');
        }
        
        setFields(data.fields);
      } catch (err) {
        console.error('Error fetching fields:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    if (user) {
      fetchFields();
    }
  }, [user]);

  if (loading) {
    return (
      <Layout>
        <LoadingState message="Loading Kantata fields..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto mt-8">
          <ErrorDisplay error={error} />
          <div className="mt-4">
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Guard clause for when fields is null
  if (!fields || !fields.custom_fields) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto mt-8">
          <p>No fields data available. The API response format may be different than expected.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto mt-8">
        <h1 className="text-3xl font-bold mb-6">Kantata Custom Fields</h1>
        
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Type</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {fields.results && fields.results.map((fieldId: string) => {
                const field = fields.custom_fields[fieldId];
                return field ? (
                  <tr key={fieldId}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{field.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{field.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{field.value_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{field.subject_type}</td>
                  </tr>
                ) : null;
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
};

// Protect this page with the Admin role requirement
export default withRoleProtection(KantataFieldsPage, ['Admin']);