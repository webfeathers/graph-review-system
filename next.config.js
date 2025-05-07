/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // For standalone builds with Node.js dependencies
  output: 'standalone',
  
  // Optimize webpack configuration
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Keep Node.js modules as external when running on the server
      config.externals = [...config.externals, 'nodemailer'];
    }
    
    // Provide fallbacks for Node modules in client
    if (!config.resolve.fallback) {
      config.resolve.fallback = {};
    }
    config.resolve.fallback.fs = false;
    
    return config;
  },
  
  // Enable experimental features for better performance
  experimental: {
    scrollRestoration: true,
  },
}

module.exports = nextConfig