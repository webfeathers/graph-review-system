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
  statusUpdated: boolean;
}

const AdminPage: NextPage = () => {
  // State for validation
  const [validating, setValidating] = useState(false);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runValidation = async () => {
    try {
      console.log("Starting validation process");
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
      
      console.log("Calling validation API endpoint");
      
      // Call your API endpoint
      const response = await fetch('/api/kantata/validate-projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log("API response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response text:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || 'Failed to validate projects');
        } catch (e) {
          throw new Error('Failed to validate projects: ' + errorText);
        }
      }
      
      // Log the full response data for debugging
      const responseText = await response.text();
      console.log("Raw response:", responseText);
      
      // Parse the response manually to avoid double-parsing
      let data;
      try {
        data = JSON.parse(responseText);
        console.log("Parsed validation data:", data);
      } catch (e) {
        console.error("Failed to parse response JSON:", e);
        throw new Error("Invalid response format from validation API");
      }
      
      // Set the message and results directly from the response
      setMessage(data.message || 'Validation complete!');
      setResults(data.validationResults || []);
      
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
              <h3 className="text-lg font-medium text-gray-900">Validation Results</h3>
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Review</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Graph Review Status</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Kantata Status</th>
                      <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {results.map((result) => (
                      <tr key={result.reviewId} className={result.isValid ? 'bg-green-50' : 'bg-red-50'}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm">
                          <div className="font-medium text-gray-900">
                            <Link href={`/reviews/${result.reviewId}`} className="text-blue-600 hover:text-blue-900">
                              {result.reviewTitle}
                            </Link>
                          </div>
                          <div className="text-gray-500">
                            Review ID:{' '}
                            <Link href={`/reviews/${result.reviewId}`} className="text-blue-600 hover:text-blue-900">
                              {result.reviewId}
                            </Link>
                          </div>
                          {result.kantataProjectId !== 'N/A' && (
                            <div className="text-gray-500">
                              Kantata ID:{' '}
                              <a 
                                href={`https://leandata.mavenlink.com/workspaces/${result.kantataProjectId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-900"
                              >
                                {result.kantataProjectId}
                              </a>
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                            result.reviewStatus === 'Approved' ? 'bg-green-100 text-green-700' :
                            result.reviewStatus === 'Needs Work' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {result.reviewStatus}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          {typeof result.kantataStatus === 'string' ? (
                            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700">
                              {result.kantataStatus}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium" style={{ backgroundColor: result.kantataStatus.color + '20', color: result.kantataStatus.color }}>
                              {result.kantataStatus.message}
                              {result.statusUpdated && (
                                <span className="ml-2 text-xs text-gray-500">(Updated)</span>
                              )}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <div className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                            result.isValid ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {result.isValid ? 'Valid' : 'Invalid'}
                          </div>
                          <div className="mt-1 text-xs text-gray-500">{result.message}</div>
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
      </div>
    </Layout>
  );
};

// Protect this page with the Admin role requirement
export default withRoleProtection(AdminPage, ['Admin']);