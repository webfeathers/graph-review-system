import React, { ReactNode } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface AdminLayoutProps {
  children: ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const router = useRouter();

  const isActive = (path: string) => {
    return router.pathname === path;
  };

  const navItems = [
    {
      title: 'Dashboard',
      path: '/admin',
      description: 'Overview and quick actions'
    },
    {
      title: 'User Management',
      path: '/admin/users',
      description: 'Manage user accounts and roles'
    },
    {
      title: 'Kantata Integration',
      path: '/admin/kantata',
      description: 'Manage Kantata projects and validation',
      subItems: [
        {
          title: 'Projects',
          path: '/admin/kantata/projects',
          description: 'View and manage Kantata projects'
        },
        {
          title: 'Validation',
          path: '/admin/kantata/validation',
          description: 'Validate project statuses'
        }
      ]
    },
    {
      title: 'Admin Guide',
      path: '/admin/help',
      description: 'Documentation and best practices'
    }
  ];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Admin Panel</h2>
        </div>
        <nav className="p-4">
          {navItems.map((item) => (
            <div key={item.path} className="mb-4">
              <Link
                href={item.path}
                className={`block px-4 py-2 rounded-lg ${
                  isActive(item.path)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{item.title}</div>
                <div className="text-sm text-gray-500">{item.description}</div>
              </Link>
              {item.subItems && (
                <div className="ml-4 mt-2 space-y-1">
                  {item.subItems.map((subItem) => (
                    <Link
                      key={subItem.path}
                      href={subItem.path}
                      className={`block px-4 py-2 rounded-lg ${
                        isActive(subItem.path)
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium">{subItem.title}</div>
                      <div className="text-sm text-gray-500">{subItem.description}</div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        {children}
      </div>
    </div>
  );
};

export default AdminLayout; 