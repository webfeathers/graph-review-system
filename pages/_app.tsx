// pages/_app.tsx
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../components/AuthProvider';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../components/AuthProvider';

function MyApp({ Component, pageProps }: AppProps) {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // Force a direct navigation to dashboard if logged in and on login page
  useEffect(() => {
    if (!loading && user && router.pathname === '/login') {
      // Use window.location for a hard redirect to avoid Next.js routing issues
      window.location.href = '/dashboard';
    }
  }, [user, loading, router.pathname]);

  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp;
/*
// Server-side only import (will be excluded from client bundle)
if (typeof window === 'undefined') {
  // This will only run on the server
  require('../lib/startup').runStartupValidations();
}

function MyApp({ Component, pageProps }: AppProps) {
  useEffect(() => {
    // Client-side initialization here if needed
  }, []);
  
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp;
*/