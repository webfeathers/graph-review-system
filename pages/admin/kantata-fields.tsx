// pages/admin/kantata-fields.tsx
import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { withRoleProtection } from '../../components/withRoleProtection';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { LoadingState } from '../../components/LoadingState';
import { ErrorDisplay } from '../../components/ErrorDisplay';

const KantataFieldsPage = () => {
  const [fieldsData, setFieldsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [rawResponse, setRawResponse] = useState<string>('');

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
        
        // Store raw response for debugging
        const responseText = await response.text();
        setRawResponse(responseText);
        
        // Try to parse the response
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          throw new Error(`Failed to parse API response: ${parseError}`);
        }
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch Kantata fields');
        }
        
        setFieldsData(data.fields);
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

  // Parse the full field details from the response
  const parseCustomFields = () => {
    if (!fieldsData) return [];
    
    // Check if custom_fields property exists
    if (fieldsData.custom_fields) {
      // Get the custom fields from the response
      const customFields = fieldsData.results?.map((result: any) => {
        const fieldId = result.id;
        // Get the full field details
        return fieldsData.custom_fields[fieldId];
      }).filter(Boolean);
      
      return customFields || [];
    }
    
    // If we don't find custom_fields, try to use results directly
    return fieldsData.results || [];
  };
  
  const customFields = parseCustomFields();

  return (
    <Layout>
      <div className="max-w-6xl mx-auto mt-8">
        <h1 className="text-3xl font-bold mb-6">Kantata Custom Fields</h1>
        
        {(!fieldsData || customFields.length === 0) ? (
          <div>
            <p className="mb-4">No fields data available or unexpected response format.</p>
            <div className="bg-gray-100 p-4 rounded">
              <h3 className="font-bold">Raw Response (for debugging)</h3>
              <pre className="mt-2 whitespace-pre-wrap text-xs">{rawResponse}</pre>
            </div>
          </div>
        ) : (
          <>
            <p className="mb-4">Found {customFields.length} custom fields</p>
            
            <div className="bg-white shadow-md rounded-lg overflow-hidden mb-8">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subject Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customFields.map((field: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{field.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{field.name || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{field.value_type || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{field.subject_type || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(field.id);
                            alert(`Copied ID: ${field.id}`);
                          }}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                        >
                          Copy ID
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="bg-gray-100 p-4 rounded mt-8">
              <h3 className="font-bold mb-2">Raw API Response (for debugging)</h3>
              <div className="max-h-96 overflow-auto">
                <pre className="whitespace-pre-wrap text-xs">{JSON.stringify(fieldsData, null, 2)}</pre>
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

// Protect this page with the Admin role requirement
export default withRoleProtection(KantataFieldsPage, ['Admin']);