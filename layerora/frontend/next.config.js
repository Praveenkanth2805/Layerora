/** @type {import('next').NextConfig} */

const nextConfig = {
  images: {
    domains: ['localhost', 'your-s3-domain.com'],
  },
};

module.exports = nextConfig;