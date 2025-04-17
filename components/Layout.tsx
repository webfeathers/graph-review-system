import React, { ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const router = useRouter();
  
  const handleLogout = () => {
    // Clear token from localStorage or use NextAuth signOut
    localStorage.removeItem('token');
    router.push('/login');
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-600 text-white shadow">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold">
            Graph Review App
          </Link>
          
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
        </div>
      </header>
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      
      <footer className="bg-gray-100 py-4">
        <div className="container mx-auto px-4 text-center text-gray-600">
          &copy; {new Date().getFullYear()} Graph Review App
        </div>
      </footer>
    </div>
  );
};

export default Layout;