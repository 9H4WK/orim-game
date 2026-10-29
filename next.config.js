/** @type {import('next').NextConfig} */
const nextConfig = {
  // Self-contained server bundle for the Docker image (Africa's Talking Marketplace)
  output: 'standalone',
  // Server-only packages loaded at runtime by Node rather than bundled
  serverExternalPackages: ['africastalking', 'pg', '@electric-sql/pglite'],
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
  ],
};

module.exports = nextConfig;
