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
  teamLead?: string;
  teamLeadEmail?: string;
  statusChanged?: boolean;
}

const AdminPage: NextPage = () => {
  // State for validation
  const [validating, setValidating] = useState(false);
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'valid' | 'invalid' | 'changed'>('all');

  const runValidation = async () => {
    try {
      setValidating(true);
      setMessage(null);
      setError(null);
      setResults([]);
      setFilter('all');
      
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

  // Function to filter results based on selected filter
  const filteredResults = () => {
    switch (filter) {
      case 'valid':
        return results.filter(r => r.isValid);
      case 'invalid':
        return results.filter(r => !r.isValid);
      case 'changed':
        return results.filter(r => r.statusChanged);
      default:
        return results;
    }
  };

  // Count of different result types
  const validCount = results.filter(r => r.isValid).length;
  const invalidCount = results.filter(r => !r.isValid).length;
  const changedCount = results.filter(r => r.statusChanged).length;

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
              Projects marked as "Live" in Kantata that don't have "Approved" status in Graph Review will be automatically set back to "In Development".
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
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Validation Results</h3>
                
                {/* Filter controls */}
                <div className="flex space-x-2">
                  <span className="text-sm text-gray-600 mr-2">Filter:</span>
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1 text-sm rounded ${
                      filter === 'all' 
                        ? 'bg-gray-200 font-medium' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    All ({results.length})
                  </button>
                  <button
                    onClick={() => setFilter('valid')}
                    className={`px-3 py-1 text-sm rounded ${
                      filter === 'valid' 
                        ? 'bg-green-200 font-medium' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Valid ({validCount})
                  </button>
                  <button
                    onClick={() => setFilter('invalid')}
                    className={`px-3 py-1 text-sm rounded ${
                      filter === 'invalid' 
                        ? 'bg-red-200 font-medium' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Invalid ({invalidCount})
                  </button>
                  <button
                    onClick={() => setFilter('changed')}
                    className={`px-3 py-1 text-sm rounded ${
                      filter === 'changed' 
                        ? 'bg-yellow-200 font-medium' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                    disabled={changedCount === 0}
                  >
                    Auto-Fixed ({changedCount})
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Review</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Graph Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kantata Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team Lead</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredResults().map((result, index) => (
                      <tr key={index} className={
                        result.statusChanged 
                          ? 'bg-yellow-50' 
                          : result.isValid 
                            ? 'bg-green-50' 
                            : 'bg-red-50'
                      }>
                        <td className="px-4 py-2">
                          <Link href={`/reviews/${result.reviewId}`} className="text-blue-500 hover:underline">
                            {result.reviewTitle || 'Untitled Review'}
                          </Link>
                          {result.kantataProjectId && result.kantataProjectId !== 'N/A' && (
                            <div className="mt-1">
                              <a 
                                href={`https://leandata.mavenlink.com/workspaces/${result.kantataProjectId}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-gray-500 hover:underline flex items-center"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                Kantata Project
                              </a>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span className={
                            result.reviewStatus === 'Approved' 
                              ? 'px-2 py-1 text-xs rounded-full bg-green-100 text-green-800' 
                              : 'px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800'
                          }>
                            {result.reviewStatus}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center">
                            {typeof result.kantataStatus === 'string' ? (
                              <span>{result.kantataStatus}</span>
                            ) : (
                              <div className="flex items-center">
                                <span
                                  className="h-3 w-3 rounded-full mr-2"
                                  style={{ backgroundColor: result.kantataStatus.color || '#ccc' }}
                                ></span>
                                <span>{result.kantataStatus.message}</span>
                              </div>
                            )}
                            {result.statusChanged && (
                              <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                                Changed to In Development
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {result.isValid ? (
                            <span className="text-green-600 flex items-center">
                              <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Valid
                            </span>
                          ) : (
                            <span className="text-red-600">
                              {result.message}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm">
                          {result.teamLead && result.teamLead !== 'Unknown' ? (
                            <div>
                              <div>{result.teamLead}</div>
                              {result.statusChanged && result.teamLeadEmail && (
                                <div className="text-xs text-gray-500">Email notification sent</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {filteredResults().length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-4 text-center text-gray-500">
                          No results match the selected filter.
                        </td>
                      </tr>
                    )}
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