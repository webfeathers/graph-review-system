// pages/index.tsx
import type { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthProvider';
import { useEffect } from 'react';

const Home: NextPage = () => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    
    // If not logged in, redirect to login page
    if (!user) {
      router.push('/login');
    } else {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Graph Review App</h1>
        <p className="mb-8">A simple application for reviewing and discussing graphs</p>
      </div>
    </div>
  );
};

export default Home;