/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // Remove deprecated appDir option
  },
}

module.exports = nextConfig 