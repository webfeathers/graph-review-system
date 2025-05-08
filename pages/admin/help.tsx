import type { NextPage } from 'next';
import { withRoleProtection } from '../../components/withRoleProtection';
import AdminLayout from '../../components/AdminLayout';

const AdminHelpPage: NextPage = () => {
  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Admin Guide</h1>
        
        {/* Overview Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Overview</h2>
          <p className="text-gray-600 mb-4">
            The Admin Panel provides tools for managing users, monitoring Kantata projects, and ensuring data consistency across the system.
          </p>
        </section>

        {/* User Management Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">User Management</h2>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-medium mb-2">Managing Users</h3>
            <p className="text-gray-600 mb-4">
              The User Management section allows you to:
            </p>
            <ul className="list-disc list-inside ml-6 text-gray-600 space-y-2">
              <li>View all registered users and their roles</li>
              <li>Update user roles between Member and Admin</li>
              <li>Monitor user activity and review counts</li>
              <li>Manage user permissions and access</li>
            </ul>
          </div>
        </section>

        {/* Kantata Integration Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Kantata Integration</h2>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-medium mb-2">Projects Management</h3>
              <p className="text-gray-600 mb-4">
                The Kantata Projects page provides tools to:
              </p>
              <ul className="list-disc list-inside ml-6 text-gray-600 space-y-2">
                <li>View all active Kantata projects</li>
                <li>Monitor project status and review status</li>
                <li>Link reviews to Kantata projects</li>
                <li>Filter and sort projects by various criteria</li>
                <li>View projects in both list and card views</li>
              </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-medium mb-2">Status Validation</h3>
              <p className="text-gray-600 mb-4">
                The Status Validation tool helps ensure consistency between Kantata and Graph Review:
              </p>
              <ul className="list-disc list-inside ml-6 text-gray-600 space-y-2">
                <li>Validate project statuses across both systems</li>
                <li>Identify mismatches between Kantata and review statuses</li>
                <li>Generate reports of validation results</li>
                <li>Track status updates and changes</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Best Practices Section */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Admin Best Practices</h2>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <ul className="list-disc list-inside ml-6 text-gray-600 space-y-2">
              <li>Regularly validate project statuses to ensure data consistency</li>
              <li>Review user roles and permissions periodically</li>
              <li>Monitor the system status dashboard for any issues</li>
              <li>Keep project links and statuses up to date</li>
              <li>Use the filtering and sorting tools to manage large datasets</li>
            </ul>
          </div>
        </section>

        {/* Need Help? */}
        <section className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Need Additional Help?</h2>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <p className="text-gray-600">
              For technical issues or questions about the admin features, please contact the system administrator or refer to the technical documentation.
            </p>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
};

export default withRoleProtection(AdminHelpPage, ['Admin']); 