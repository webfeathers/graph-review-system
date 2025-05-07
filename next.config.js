/** @type {import('next').NextConfig} */
const path = require('path');

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
    
    // Basic optimization settings
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      splitChunks: {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            chunks: 'all',
          },
        },
      },
    };

    // Provide fallbacks for Node modules in client
    if (!config.resolve.fallback) {
      config.resolve.fallback = {};
    }
    config.resolve.fallback.fs = false;

    // Basic cache configuration
    config.cache = {
      type: 'filesystem',
      version: '1',
      cacheDirectory: path.resolve(__dirname, '.next/cache'),
      store: 'pack',
      buildDependencies: {
        config: [__filename],
      },
    };
    
    return config;
  },
  
  // Enable experimental features for better performance
  experimental: {
    optimizeCss: true,
    scrollRestoration: true,
  },
}

module.exports = nextConfig