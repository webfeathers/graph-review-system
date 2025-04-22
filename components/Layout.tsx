// components/Layout.tsx
import React, { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from './AuthProvider';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  const { user, signOut } = useAuth();
  
  const handleLogout = async () => {
    await signOut();
  };
  
  return (
    <div className="min-h-screen flex flex-col font-['Montserrat',sans-serif]">
      <header className="bg-[#2db670] text-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center">
            <img 
              src="https://kcihsgnpmxzgdgwdijgx.supabase.co/storage/v1/object/public/graph-images/ld-logo.png" 
              alt="LeanData Logo" 
              className="h-8 mr-2" 
            />
          </Link>
          
          {user && (
            <nav className="flex items-center space-x-4">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              <Link href="/reviews" className="hover:underline">
                Reviews
              </Link>
              <Link href="/reviews/new" className="hover:underline">
                New Review
              </Link>
              <button onClick={handleLogout} className="hover:underline">
                Logout
              </button>
            </nav>
          )}
          
          {!user && (
            <nav className="flex items-center space-x-4">
              <Link href="/login" className="hover:underline">
                Login
              </Link>
              <Link href="/register" className="hover:underline">
                Register
              </Link>
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