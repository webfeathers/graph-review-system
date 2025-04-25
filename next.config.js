/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // For standalone builds with Node.js dependencies
  output: 'standalone',
  
  // Prevent webpack from trying to bundle node modules
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Keep Node.js modules as external when running on the server
      // This fixes issues with modules like nodemailer
      config.externals = [...config.externals, 'nodemailer'];
    }
    
    return config;
  },
}

module.exports = nextConfig