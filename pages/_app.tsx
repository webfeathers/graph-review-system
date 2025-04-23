// pages/_app.tsx
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../components/AuthProvider';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <Component {...pageProps} />
    </AuthProvider>
  );
}

export default MyApp;

// Server-side only import (will be excluded from client bundle)
if (typeof window === 'undefined') {
  // This will only run on the server
  require('../lib/startup').runStartupValidations();
}

// Add this to _app.tsx to debug router events
useEffect(() => {
  const handleRouteChange = (url: string) => {
    console.log('Route changing to:', url);
  };
  
  const handleRouteComplete = (url: string) => {
    console.log('Route change completed to:', url);
  };
  
  const handleRouteError = (err: any, url: string) => {
    console.error('Error changing route to:', url, err);
  };
  
  router.events.on('routeChangeStart', handleRouteChange);
  router.events.on('routeChangeComplete', handleRouteComplete);
  router.events.on('routeChangeError', handleRouteError);
  
  return () => {
    router.events.off('routeChangeStart', handleRouteChange);
    router.events.off('routeChangeComplete', handleRouteComplete);
    router.events.off('routeChangeError', handleRouteError);
  };
}, [router.events]);