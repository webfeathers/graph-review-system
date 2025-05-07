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
        <h2 className="text-lg font-semibold mb-4">Filters</h2>
        
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
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center">
                      Project
                      <span className="ml-2">{getSortIcon('title')}</span>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      <span className="ml-2">{getSortIcon('status')}</span>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center">
                      Created
                      <span className="ml-2">{getSortIcon('createdAt')}</span>
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 group"
                    onClick={() => handleSort('hasGraphReview')}
                  >
                    <div className="flex items-center">
                      Graph Review
                      <span className="ml-2">{getSortIcon('hasGraphReview')}</span>
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProjects.map((project) => (
                  <tr key={project.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {project.title}
                      </div>
                      <div className="text-sm text-gray-500">
                        ID: {project.id}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(project.kantataStatus?.message)}`}>
                        {project.kantataStatus?.message || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(project.lastUpdated).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <a 
                          href={`https://leandata.mavenlink.com/workspaces/${project.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View in Kantata
                        </a>
                        {!project.hasGraphReview && (
                          <Link
                            href={`/reviews/new?kantataProjectId=${project.id}&title=${encodeURIComponent(project.title)}`}
                            className="text-green-600 hover:text-green-900 ml-4"
                          >
                            Create Review
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

// Protect this page with the Admin role requirement
export default withRoleProtection(KantataProjectsPage, ['Admin']);