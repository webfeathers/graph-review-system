import type { NextPage } from 'next';
import { withRoleProtection } from '../../components/withRoleProtection';
import AdminLayout from '../../components/AdminLayout';
import UserManagement from '../../components/UserManagement';

const UserManagementPage: NextPage = () => {
  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="mt-2 text-gray-600">Manage user accounts, roles, and permissions.</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <UserManagement />
        </div>
      </div>
    </AdminLayout>
  );
};

export default withRoleProtection(UserManagementPage, ['Admin']); 