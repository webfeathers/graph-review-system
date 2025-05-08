// components/Layout.tsx
import React, { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './AuthProvider';

/**
 * Props for the Layout component
 */
interface LayoutProps {
  /** The content to be rendered within the layout */
  children: ReactNode;
}

/**
 * The main layout component that provides the application's structure.
 * It includes a header with navigation, a main content area, and a footer.
 * The navigation adapts based on the user's authentication status and role.
 * 
 * Features:
 * - Responsive header with logo and navigation
 * - Role-based navigation (admin links only shown to admin users)
 * - Authentication-aware navigation (different options for logged-in vs logged-out users)
 * - Consistent footer across all pages
 * 
 * @example
 * // Basic usage
 * <Layout>
 *   <YourPageContent />
 * </Layout>
 * 
 * @example
 * // With nested components
 * <Layout>
 *   <div className="your-content">
 *     <h1>Welcome</h1>
 *     <p>Your content here</p>
 *   </div>
 * </Layout>
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const { user, signOut, isAdmin } = useAuth();
  
  /**
   * Handles user logout by calling the signOut function from AuthProvider
   */
  const handleLogout = async () => {
    await signOut();
  };

  /**
   * Handles navigation to different routes using Next.js router
   * @param path - The target route path
   */
  const handleNavigation = (path: string) => {
    router.replace(path);
  };
  
  return (
    <div className="min-h-screen flex flex-col font-['Montserrat',sans-serif]">
      <header className="bg-[#FFFFFF] Xtext-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <button onClick={() => handleNavigation('/dashboard')} className="flex items-center">
            <img 
              src="https://kcihsgnpmxzgdgwdijgx.supabase.co/storage/v1/object/public/avatars/ld-logo.png" 
              alt="Logo" 
              className="h-8 w-auto" 
            />
          </button>
          
          {user && (
            <nav className="flex items-center space-x-4">
              <button onClick={() => handleNavigation('/dashboard')} className="hover:underline">
                Dashboard
              </button>
              <button onClick={() => handleNavigation('/reviews')} className="hover:underline">
                Reviews
              </button>
              <button onClick={() => handleNavigation(`/profile/${user.id}`)} className="hover:underline">
                Profile
              </button>
              <button onClick={() => handleNavigation('/help')} className="hover:underline">
                Help
              </button>
              {/* Only show Admin links for users with Admin role */}
              {isAdmin() && (
                <>
                  <button onClick={() => handleNavigation('/admin')} className="hover:underline">
                    Admin
                  </button>
                </>
              )}
              <button onClick={handleLogout} className="hover:underline">
                Logout
              </button>
            </nav>
          )}
          
          {!user && (
            <nav className="flex items-center space-x-4">
              <button onClick={() => handleNavigation('/login')} className="hover:underline">
                Login
              </button>
              <button onClick={() => handleNavigation('/register')} className="hover:underline">
                Register
              </button>
            </nav>
          )}
        </div>
      </header>
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      
      <footer className="bg-[#58595b] text-white py-4">
        <div className="container mx-auto px-4 text-center">
          &copy; {new Date().getFullYear()} LeanData Graph Review
        </div>
      </footer>
    </div>
  );
};

export default Layout;