// pages/_app.tsx
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import AuthProvider from '../components/AuthProvider';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { Toaster } from 'react-hot-toast';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();

  // Add debugging for router events
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      console.log('Route changing to:', url);
    };
    
    const handleRouteComplete = (url: string) => {
      console.log('Route change completed to:', url);
    };
    
    const handleRouteError = (err: any, url: string) => {
      console.error('Error changing route to:', url, err);
      if (err.cancelled) {
        console.log('Route change was cancelled');
      }
    };

    const handleBeforeHistoryChange = (url: string) => {
      console.log('Before history change:', url);
    };

    router.events.on('routeChangeStart', handleRouteChange);
    router.events.on('routeChangeComplete', handleRouteComplete);
    router.events.on('routeChangeError', handleRouteError);
    router.events.on('beforeHistoryChange', handleBeforeHistoryChange);
    
    return () => {
      router.events.off('routeChangeStart', handleRouteChange);
      router.events.off('routeChangeComplete', handleRouteComplete);
      router.events.off('routeChangeError', handleRouteError);
      router.events.off('beforeHistoryChange', handleBeforeHistoryChange);
    };
  }, [router.events]);

  return (
    <>
      <Toaster position="top-right" />
      <AuthProvider>
        <Component {...pageProps} />
      </AuthProvider>
    </>
  );
}

export default MyApp;

// Server-side only import (will be excluded from client bundle)
if (typeof window === 'undefined') {
  // This will only run on the server
  require('../lib/startup').runStartupValidations();
}