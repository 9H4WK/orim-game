/** @type {import('next').NextConfig} */
const nextConfig = {
  // Suppress service-worker-related fetch errors from wallet adapter extensions
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        { key: 'Service-Worker-Allowed', value: '/' },
      ],
    },
  ],
  turbopack: {}, // Suppress Next.js 16 warning when using custom webpack config
  webpack: (config, { isServer }) => {
    // Wallet adapter polyfills
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    if (!isServer) {
      // Prevent Node.js modules from bundling in browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
