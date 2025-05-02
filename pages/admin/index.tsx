// pages/admin/index.tsx
import type { NextPage } from 'next';
import { useState } from 'react';
import Layout from '../../components/Layout';
import UserManagement from '../../components/UserManagement';
import { withRoleProtection } from '../../components/withRoleProtection';
import { Button } from '../../components/Button';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { supabase } from '../../lib/supabase';
import Link from 'next/link';

// Interface for validation result
interface ValidationResult {
  reviewId: string;
  reviewTitle: string;
  reviewStatus: string;
  kantataProjectId: string;
  kantataStatus: string | {
    color: string;
    key: number;
    message: string;
  };
  isValid: boolean;
  message: string;
}

const AdminPage: NextPage = () => {
  // State for validation
  const [validating, setValidating] = useState(false);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runValidation = async () => {
    try {
      setValidating(true);
      setMessage(null);
      setError(null);
      setResults([]);
      
      // Get auth token
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      // Call your API endpoint
      const response = await fetch('/api/kantata/validate-projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to validate projects');
      }
      
      const data = await response.json();
      
      // Safely set results - make sure validationResults exists and is an array
      if (data && Array.isArray(data.validationResults)) {
        setResults(data.validationResults);
      } else {
        console.warn('Expected validationResults array but got:', data);
        // Initialize as empty array if not present or not an array
        setResults([]);
      }
      
      // Show success message
      setMessage(data.message || 'Validation complete!');
    } catch (error) {
      console.error('Error running validation:', error);
      // Make sure we're setting a string for the error
      setError(typeof error === 'string' ? error : 
               error instanceof Error ? error.message : 
               'An unexpected error occurred');
    } finally {
      setValidating(false);
    }
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage users and application settings</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Kantata Validation Section */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Kantata Status Validation</h2>
          
          <div className="mb-4">
            <p className="text-gray-600 mb-2">
              Validate the status of all projects in Kantata to ensure they match the Graph Review status.
              This will check for projects marked as "Live" in Kantata that don't have "Approved" status in Graph Review.
            </p>
            
            <Button
              onClick={runValidation}
              variant="primary"
              isLoading={validating}
              disabled={validating}
              className="mt-2"
            >
              {validating ? 'Validating...' : 'Run Validation Now'}
            </Button>
          </div>
          
          {message && (
            <div className="bg-green-100 text-green-700 p-3 rounded-md mb-4">
              {message}
            </div>
          )}
          
          {error && (
            <ErrorDisplay
              error={error}
              onDismiss={() => setError(null)}
              className="mb-4"
            />
          )}
          
          {results && results.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Validation Results</h3>
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kantata Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {results.map((result, index) => (
                      <tr key={index} className={result.isValid ? 'bg-green-50' : 'bg-red-50'}>
                        <td className="px-4 py-2">
                          <Link href={`/reviews/${result.reviewId}`} className="text-blue-500 hover:underline">
                            {result.reviewTitle || 'Untitled Review'}
                          </Link>
                        </td>
                        <td className="px-4 py-2">{result.reviewStatus || 'Unknown'}</td>
                        <td className="px-4 py-2">
                          <p>Status: {
                              typeof result.kantataStatus === 'string'
                                ? result.kantataStatus
                                : result.kantataStatus?.message ?? 'Unknown'
                            }</p>
                        </td>
                        <td className="px-4 py-2">
                          {result.isValid 
                            ? <span className="text-green-600">✓ Valid</span> 
                            : <span className="text-red-600">✗ {result.message || 'Invalid'}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <UserManagement />
        
        {/* You can add more admin components here */}
        {/* <SystemSettings /> */}
        {/* <Statistics /> */}
      </div>
    </Layout>
  );
};

// Protect this page with the Admin role requirement
export default withRoleProtection(AdminPage, ['Admin']);