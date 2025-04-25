/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone', // Add this line
  
  // This tells Next.js that nodemailer is a server-side only package
  experimental: {
    serverComponentsExternalPackages: ['nodemailer'],
  },
}

module.exports = nextConfig