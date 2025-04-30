// pages/admin/kantata-debug.tsx
import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { withRoleProtection } from '../../components/withRoleProtection';
import { useAuth } from '../../components/AuthProvider';
import { supabase } from '../../lib/supabase';
import { LoadingState } from '../../components/LoadingState';
import { ErrorDisplay } from '../../components/ErrorDisplay';

const KantataDebugPage = () => {
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchKantataData() {
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
        
        // Get the raw text response for debugging
        const responseText = await response.text();
        
        let responseData;
        try {
          // Try to parse as JSON
          responseData = JSON.parse(responseText);
        } catch (e) {
          // If it's not valid JSON, use the text
          responseData = { rawText: responseText };
        }
        
        setApiResponse(responseData);
      } catch (err) {
        console.error('Error fetching fields:', err);
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    }
    
    if (user) {
      fetchKantataData();
    }
  }, [user]);

  if (loading) {
    return (
      <Layout>
        <LoadingState message="Loading Kantata API data..." />
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

  return (
    <Layout>
      <div className="max-w-6xl mx-auto mt-8">
        <h1 className="text-3xl font-bold mb-6">Kantata API Debug</h1>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">API Response</h2>
          <div className="bg-gray-800 text-white p-4 rounded-lg overflow-auto max-h-[500px]">
            <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
          </div>
        </div>
        
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">API Token Info</h2>
          <div className="bg-white shadow-md rounded-lg p-4">
            <p>Environment variable set: {process.env.KANTATA_API_TOKEN ? 'Yes' : 'No'}</p>
            {/* Don't show the actual token for security reasons */}
            <p>Token format: {process.env.KANTATA_API_TOKEN ? 
              `${process.env.KANTATA_API_TOKEN.substring(0, 5)}...${process.env.KANTATA_API_TOKEN.substring(process.env.KANTATA_API_TOKEN.length - 5)}` 
              : 'N/A'}</p>
          </div>
        </div>
        
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh Data
        </button>
      </div>
    </Layout>
  );
};

// Protect this page with the Admin role requirement
export default withRoleProtection(KantataDebugPage, ['Admin']);