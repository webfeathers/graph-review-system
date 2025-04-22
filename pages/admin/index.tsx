// pages/admin/index.tsx
import type { NextPage } from 'next';
import Layout from '../../components/Layout';
import UserManagement from '../../components/UserManagement';
import { withRoleProtection } from '../../components/withRoleProtection';

const AdminPage: NextPage = () => {
  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage users and application settings</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
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