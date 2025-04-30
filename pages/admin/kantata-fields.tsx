// pages/admin/kantata-fields.tsx
import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { withRoleProtection } from '../../components/withRoleProtection';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';

const KantataFieldsPage = () => {
  const [fields, setFields] = useState<any>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // Specify the type here
  const { user } = useAuth();

  useEffect(() => {
    const fetchFields = async () => {
      try {
        setLoading(true);
        
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
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch Kantata fields');
        }
        
        const data = await response.json();
        setFields(data.fields);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    fetchFields();
  }, []);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto mt-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto mt-8">
        <h1 className="text-3xl font-bold mb-6">Kantata Custom Fields</h1>
        
        <div className="bg-white shadow overflow-hidden rounded-lg">
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
              {fields.results?.map((fieldId: string) => {
                const field = fields.custom_fields[fieldId];
                return (
                  <tr key={field.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{field.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{field.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{field.value_type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{field.subject_type}</td>
                  </tr>
                );
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