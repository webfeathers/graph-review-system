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
  const { user, signOut, isAdmin } = useAuth();
  
  const handleLogout = async () => {
    await signOut();
  };
  
  return (
    <div className="min-h-screen flex flex-col font-['Montserrat',sans-serif]">
      <header className="bg-[#FFFFFF] Xtext-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <a href="/" className="flex items-center">
            <img 
              src="https://kcihsgnpmxzgdgwdijgx.supabase.co/storage/v1/object/public/graph-images/ld-logo.png" 
              alt="LeanData Logo" 
              className="h-8 mr-2" 
            />
          </a>
          
          {user && (
            // components/Layout.tsx - temporarily use anchor tags instead of Link
<nav className="flex items-center space-x-4">
  <a href="/dashboard" className="hover:underline">
    Dashboard
  </a>
  <a href="/reviews" className="hover:underline">
    Reviews
  </a>
  <a href="/reviews/new" className="hover:underline">
    New Review
  </a>
  {/* Only show Admin links for users with Admin role */}
  {/* Admin Section with Dropdown */}
  {isAdmin() && (
    <div className="relative group inline-block">
      <a href="/admin" className="hover:underline flex items-center">
        Admin
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </a>
      <div className="absolute left-0 hidden group-hover:block bg-white shadow-lg rounded-md p-2 mt-1 z-10 min-w-max">
        <a href="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
          Dashboard
        </a>
        <a href="/admin/kantata-projects" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md">
          Kantata Projects
        </a>
      </div>
    </div>
  )}



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