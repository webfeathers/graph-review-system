import React, { ReactNode } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

/**
 * Props for the AdminLayout component
 */
interface AdminLayoutProps {
  /** The content to be rendered within the admin layout */
  children: ReactNode;
}

/**
 * Navigation sub-item configuration
 */
interface NavSubItem {
  /** Title of the navigation item */
  title: string;
  /** Path to navigate to */
  path: string;
  /** Description of the navigation item */
  description: string;
}

/**
 * Navigation item configuration
 */
interface NavItem {
  /** Title of the navigation item */
  title: string;
  /** Path to navigate to (optional for header items) */
  path?: string;
  /** Description of the navigation item (optional for header items) */
  description?: string;
  /** Whether this item is a header (non-clickable) */
  isHeader?: boolean;
  /** Sub-items for hierarchical navigation */
  subItems?: NavSubItem[];
}

/**
 * A specialized layout component for the admin section of the application.
 * Provides a consistent admin interface with a sidebar navigation and main content area.
 * 
 * Features:
 * - Responsive sidebar navigation
 * - Hierarchical navigation structure with main items and sub-items
 * - Active state highlighting for current route
 * - Descriptive navigation items with titles and descriptions
 * 
 * @example
 * // Basic usage
 * <AdminLayout>
 *   <YourAdminPageContent />
 * </AdminLayout>
 * 
 * @example
 * // With nested components
 * <AdminLayout>
 *   <div className="admin-content">
 *     <h1>User Management</h1>
 *     <UserManagementTable />
 *   </div>
 * </AdminLayout>
 */
const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const router = useRouter();

  /**
   * Determines if a navigation item is currently active
   * @param path - The path to check against the current route
   * @returns boolean indicating if the path matches the current route
   */
  const isActive = (path: string) => {
    return router.pathname === path;
  };

  /**
   * Navigation items configuration for the admin sidebar
   * Each item can have optional sub-items for hierarchical navigation
   */
  const navItems: NavItem[] = [
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
      isHeader: true,
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
            <div key={item.path || item.title} className="mb-4">
              {item.isHeader ? (
                <div className="px-4 py-2 font-medium text-gray-700">
                  {item.title}
                </div>
              ) : (
                <Link
                  href={item.path!}
                  className={`block px-4 py-2 rounded-lg ${
                    isActive(item.path!)
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-gray-500">{item.description}</div>
                </Link>
              )}
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