// pages/_app.tsx
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '../components/AuthProvider';
import { useEffect } from 'react';

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