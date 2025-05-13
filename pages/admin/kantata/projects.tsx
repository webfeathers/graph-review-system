import type { NextPage } from 'next';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { withRoleProtection } from '../../../components/withRoleProtection';
import AdminLayout from '../../../components/AdminLayout';
import { useAuth } from '../../../components/AuthProvider';
import { ErrorDisplay } from '../../../components/ErrorDisplay';
import { LoadingState } from '../../../components/LoadingState';
import { Button } from '../../../components/Button';
import { supabase } from '../../../lib/supabase';

interface KantataProject {
  id: string;
  title: string;
  kantataStatus: {
    message: string;
    key: number;
    color: string;
  };
  hasReview: boolean;
  reviewId?: string;
  reviewStatus?: string;
  lastUpdated: string;
  createdAt: string;
  startDate?: string;
  projectLead?: {
    name: string;
    headline: string;
    id: string;
  };
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
  const [sortField, setSortField] = useState<string>('startDate');
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
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Error fetching Kantata projects:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredProjects = () => {
    return projects
      .filter(project => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'in-development') return project.kantataStatus.message === 'In Development';
        if (statusFilter === 'live') return project.kantataStatus.message === 'Live';
        if (statusFilter === 'confirmed') return project.kantataStatus.message === 'Confirmed';
        if (statusFilter === 'other') return !['In Development', 'Live', 'Confirmed'].includes(project.kantataStatus.message);
        return true;
      })
      .filter(project => {
        if (hasReviewFilter === 'all') return true;
        if (hasReviewFilter === 'yes') return project.hasReview;
        if (hasReviewFilter === 'no') return !project.hasReview;
        return true;
      })
      .sort((a, b) => {
        const aValue = a[sortField as keyof KantataProject];
        const bValue = b[sortField as keyof KantataProject];
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc' 
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        
        if (aValue instanceof Date && bValue instanceof Date) {
          return sortDirection === 'asc'
            ? aValue.getTime() - bValue.getTime()
            : bValue.getTime() - aValue.getTime();
        }

        // Handle date strings
        if (sortField === 'startDate' || sortField === 'createdAt' || sortField === 'lastUpdated') {
          const aDate = new Date(aValue as string).getTime();
          const bDate = new Date(bValue as string).getTime();
          return sortDirection === 'asc'
            ? aDate - bDate
            : bDate - aDate;
        }
        
        return 0;
      });
  };

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Get status color class
  const getStatusColor = (status: { message: string; color: string }) => {
    switch (status.message) {
      case 'In Development':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'Live':
        return 'bg-green-100 text-green-800 border border-green-200';
      case 'Complete':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'Confirmed':
        return 'bg-purple-100 text-purple-800 border border-purple-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
    }
  };

  // Get review status color class
  const getReviewStatusColor = (status: string) => {
    switch (status) {
      case 'Draft':
        return 'bg-gray-100 text-gray-800 border border-gray-200';
      case 'Submitted':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      case 'In Review':
        return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
      case 'Needs Work':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'Approved':
        return 'bg-green-100 text-green-800 border border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };
  
  // Display loading state
  if (loading) {
    return (
      <AdminLayout>
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Kantata Projects</h1>
            <p className="mt-2 text-gray-600">Loading active projects from Kantata...</p>
          </div>
          <LoadingState message="Fetching projects..." />
        </div>
      </AdminLayout>
    );
  }
  
  // Get filtered projects
  const filteredProjects = getFilteredProjects();
  
  return (
    <AdminLayout>
      <div className="w-full max-w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Kantata Projects</h1>
          <p className="mt-2 text-gray-600">Manage and monitor Kantata project status</p>
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
          <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
            <h2 className="text-lg font-semibold">Filters</h2>
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
                <option value="confirmed">Confirmed</option>
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
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Active Kantata Projects
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  {filteredProjects.length} projects found
                </p>
              </div>
              <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Sort by:</span>
                <div className="flex items-center space-x-1">
                  <select
                    value={sortField}
                    onChange={(e) => handleSort(e.target.value)}
                    className="block w-40 pl-3 pr-8 py-1.5 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-md bg-white"
                  >
                    <option value="title">Title</option>
                    <option value="startDate">Start Date</option>
                    <option value="createdAt">Created Date</option>
                    <option value="lastUpdated">Last Updated</option>
                  </select>
                  <button
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    title={sortDirection === 'asc' ? 'Sort ascending' : 'Sort descending'}
                  >
                    {sortDirection === 'asc' ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 w-1/3">Project</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-1/6">Status</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-1/6">Graph Review</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-1/6">Last Updated</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 w-1/6">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {filteredProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6 max-w-[300px]">
                        <div className="flex items-center">
                          <div className="truncate">
                            <div className="font-medium text-gray-900 truncate">
                              {project.title}
                            </div>
                            <div className="text-gray-500">
                              Kantata Project: <a
                                href={`https://leandata.mavenlink.com/workspaces/${project.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-900"
                              >
                                {project.id}
                              </a>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.kantataStatus)}`}>
                          {project.kantataStatus.message}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        {project.hasReview ? (
                          <div>
                            <a
                              href={`/reviews/${project.reviewId}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              View Review
                            </a>
                            <div className="mt-1">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getReviewStatusColor(project.reviewStatus || '')}`}>
                                {project.reviewStatus}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <a
                              href={`/reviews/new?kantataProjectId=${project.id}&title=${encodeURIComponent(project.title)}${project.projectLead?.id ? `&projectLeadId=${project.projectLead.id}` : ''}`}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Create Review
                            </a>
                            <div className="text-gray-500 mt-1">
                              No review yet
                            </div>
                          </div>
                        )}
                        {project.projectLead && (
                          <div className="mt-2 text-sm text-gray-500">
                            {project.projectLead.name === 'Mavenlink Integration' ? 'Not Assigned' : `Lead: ${project.projectLead.name}`}
                          </div>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(project.lastUpdated).toLocaleDateString()}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default withRoleProtection(KantataProjectsPage, ['Admin']); 