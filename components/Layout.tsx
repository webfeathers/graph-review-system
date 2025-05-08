// components/Layout.tsx
import React, { ReactNode } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from './AuthProvider';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const { user, signOut, isAdmin } = useAuth();
  
  const handleLogout = async () => {
    await signOut();
  };

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