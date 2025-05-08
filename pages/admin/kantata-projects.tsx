// pages/admin/kantata-projects.tsx
import type { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { Button } from '../../components/Button';
import { LoadingState } from '../../components/LoadingState';
import { ErrorDisplay } from '../../components/ErrorDisplay';
import { withRoleProtection } from '../../components/withRoleProtection';
import { useAuth } from '../../components/AuthProvider';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabase';

interface KantataProject {
  id: string;
  title: string;
  kantataProjectId: string;
  kantataStatus: {
    key: number;
    message: string;
    color: string;
  };
  lastUpdated: string;
  hasGraphReview: boolean;
  graphReviewStatus?: string;
  graphReviewId?: string;
}

const KantataProjectsPage: NextPage = () => {
  // State
  const { user, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<KantataProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [hasReviewFilter, setHasReviewFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  
  // Sorting state
  const [sortField, setSortField] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Auth redirect
  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, authLoading, router]);
  
  // Fetch projects on mount
  useEffect(() => {
    if (authLoading || !user) return;
    fetchProjects();
  }, [authLoading, user]);
  
  // Fetch projects from API
  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get token for authentication
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      // Call the API endpoint
      const response = await fetch('/api/kantata/active-projects', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch Kantata projects');
      }
      
      const data = await response.json();
      
      if (!data.success && !data.projects) {
        throw new Error(data.message || 'Failed to fetch Kantata projects');
      }
      
      // Update state
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Error fetching Kantata projects:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle sorting
  const handleSort = (field: string) => {
    // If clicking the same field, toggle direction
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // If clicking a new field, set it and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };
  
  // Get filtered and sorted projects
  const getFilteredProjects = () => {
    // First filter
    const filtered = projects.filter(project => {
      // Filter by status
      if (statusFilter !== 'all') {
        if (statusFilter === 'in-development' && project.kantataStatus?.message !== 'In Development') {
          return false;
        }
        if (statusFilter === 'live' && project.kantataStatus?.message !== 'Live') {
          return false;
        }
        if (statusFilter === 'other' && ['In Development', 'Live', 'Complete', 'Confirmed'].includes(project.kantataStatus?.message)) {
          return false;
        }
      }
      
      // Filter by review status
      if (hasReviewFilter !== 'all') {
        if (hasReviewFilter === 'yes' && !project.hasGraphReview) {
          return false;
        }
        if (hasReviewFilter === 'no' && project.hasGraphReview) {
          return false;
        }
      }
      
      return true;
    });
    
    // Then sort
    return [...filtered].sort((a, b) => {
      let comparison = 0;
      
      // Sort by the selected field
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'status':
          comparison = (a.kantataStatus?.message || '').localeCompare(b.kantataStatus?.message || '');
          break;
        case 'createdAt':
          comparison = new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
          break;
        case 'hasGraphReview':
          comparison = (a.hasGraphReview === b.hasGraphReview) ? 0 : a.hasGraphReview ? -1 : 1;
          break;
        default:
          comparison = 0;
      }
      
      // Apply direction
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };
  
  // Get status color class
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Development':
        return 'bg-blue-200 text-blue-800';
      case 'Live':
        return 'bg-green-200 text-green-800';
      case 'Complete':
        return 'bg-gray-200 text-gray-800';
      case 'Confirmed':
        return 'bg-purple-200 text-purple-800';
      default:
        return 'bg-yellow-200 text-yellow-800';
    }
  };
  
  // Get a sort icon based on field and direction
  const getSortIcon = (field: string) => {
    if (field !== sortField) {
      return (
        <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };
  
  // Display loading state
  if (loading) {
    return (
      <div>
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Kantata Projects</h1>
          <p className="text-gray-600">Loading active projects from Kantata...</p>
        </div>
        <LoadingState message="Fetching projects..." />
      </div>
    );
  }
  
  // Get filtered projects
  const filteredProjects = getFilteredProjects();
  
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Kantata Projects</h1>
        <p className="text-gray-600">Manage and monitor Kantata project status</p>
      </div>
      
      {error && (
        <ErrorDisplay 
          error={error} 
          onDismiss={() => setError(null)} 
          variant="error"
          className="mb-6"
        />
      )}
      
      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Filters</h2>
          {/* View Mode Toggle */}
          <div className="flex space-x-2">
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-1 rounded ${viewMode === 'card' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              Card View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              List View
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">All Statuses</option>
              <option value="in-development">In Development</option>
              <option value="live">Live</option>
              <option value="other">Other Statuses</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Has Graph Review</label>
            <select 
              value={hasReviewFilter}
              onChange={(e) => setHasReviewFilter(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">All Projects</option>
              <option value="yes">Has Graph Review</option>
              <option value="no">No Graph Review</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <Button
              onClick={fetchProjects}
              variant="ghost"
              className="ml-4"
            >
              Refresh
            </Button>
          </div>
        </div>
      </div>
      
      {/* Projects Table */}
      <div className="bg-white shadow overflow-hidden rounded-lg">
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Active Kantata Projects
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {filteredProjects.length} projects found
          </p>
        </div>
        
        {filteredProjects.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No projects match your filter criteria
          </div>
        ) : (
          <div className="overflow-x-auto">
            {viewMode === 'card' ? (
              // Grid Layout for card view
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
                {filteredProjects.map((project) => (
                  <div key={project.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-4">
                      {/* Header with Title and Status */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-gray-900 truncate" title={project.title}>
                            {project.title}
                          </h3>
                          <p className="text-xs text-gray-500">
                            ID: {project.id}
                          </p>
                        </div>
                        <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.kantataStatus?.message)}`}>
                          {project.kantataStatus?.message || 'Unknown'}
                        </span>
                      </div>

                      {/* Project Details */}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-gray-500">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(project.lastUpdated).toLocaleDateString()}
                        </div>

                        <div className="flex items-center">
                          <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {project.hasGraphReview ? (
                            <Link 
                              href={`/reviews/${project.graphReviewId}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View Review ({project.graphReviewStatus})
                            </Link>
                          ) : (
                            <span className="text-red-500">No Review</span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                        <a 
                          href={`https://leandata.mavenlink.com/workspaces/${project.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          View in Kantata
                        </a>
                        {!project.hasGraphReview && (
                          <Link
                            href={`/reviews/new?kantataProjectId=${project.id}&title=${encodeURIComponent(project.title)}`}
                            className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md"
                          >
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create Review
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // List View
              <div className="divide-y divide-gray-200">
                {filteredProjects.map((project) => (
                  <div key={project.id} className="py-4 px-6 flex items-center">
                    {/* Status indicator */}
                    <div className="mr-4 flex flex-col items-center">
                      <div className={`w-2 h-full rounded-full ${getStatusColor(project.kantataStatus?.message)}`}></div>
                    </div>
                    
                    {/* Project content */}
                    <div className="flex-grow">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {project.title}
                          </h3>
                          <p className="text-xs text-gray-500">
                            ID: {project.id}
                          </p>
                        </div>
                        <span className={`ml-4 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.kantataStatus?.message)}`}>
                          {project.kantataStatus?.message || 'Unknown'}
                        </span>
                      </div>
                      
                      <div className="mt-2 flex items-center text-sm text-gray-500">
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(project.lastUpdated).toLocaleDateString()}
                      </div>
                      
                      <div className="mt-1">
                        {project.hasGraphReview ? (
                          <Link 
                            href={`/reviews/${project.graphReviewId}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            View Review ({project.graphReviewStatus})
                          </Link>
                        ) : (
                          <span className="text-red-500">No Review</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="ml-4 flex items-center space-x-2">
                      <a 
                        href={`https://leandata.mavenlink.com/workspaces/${project.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View in Kantata
                      </a>
                      {!project.hasGraphReview && (
                        <Link
                          href={`/reviews/new?kantataProjectId=${project.id}&title=${encodeURIComponent(project.title)}`}
                          className="inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md"
                        >
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Create Review
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Protect this page with the Admin role requirement
export default withRoleProtection(KantataProjectsPage, ['Admin']);