import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { withRoleProtection } from '../../../../components/withRoleProtection';
import AdminLayout from '../../../../components/AdminLayout';
import { useAuth } from '../../../../components/AuthProvider';
import { supabase } from '../../../../lib/supabase';

function ProjectDetailsPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useAuth();
  const [projectData, setProjectData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchProjectDetails = async () => {
      try {
        // Get token for authentication
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        
        if (!token) {
          throw new Error('No authentication token available');
        }

        const response = await fetch(`/api/kantata/project-details?projectId=${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch project details');
        }
        const data = await response.json();
        setProjectData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetails();
  }, [id]);

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div>Loading project details...</div>
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div className="text-red-500">Error: {error}</div>
        </div>
      </AdminLayout>
    );
  }

  if (!projectData) {
    return (
      <AdminLayout>
        <div className="container mx-auto p-6">
          <div>Project not found</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Project Details</h1>
        <pre className="bg-gray-100 p-4 rounded-lg overflow-auto">
          {JSON.stringify(projectData, null, 2)}
        </pre>
      </div>
    </AdminLayout>
  );
}

export default withRoleProtection(ProjectDetailsPage, ['Admin']); 