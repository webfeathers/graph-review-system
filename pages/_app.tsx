// pages/_app.tsx
import '../styles/globals.css';
import type { AppProps } from 'next/app';
import AuthProvider from '../components/AuthProvider';
import { Toaster } from 'react-hot-toast';
import Layout from '../components/Layout';
import { useRouter } from 'next/router';

// Pages that should not have the layout
const NO_LAYOUT_PAGES = ['/login'];

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const shouldShowLayout = !NO_LAYOUT_PAGES.includes(router.pathname);

  return (
    <>
      <Toaster position="top-right" />
      <AuthProvider>
        {shouldShowLayout ? (
          <Layout>
            <Component {...pageProps} />
          </Layout>
        ) : (
          <Component {...pageProps} />
        )}
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