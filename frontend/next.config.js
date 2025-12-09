/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone', // Enable standalone output for Docker
  images: {
    // Allow local images and Cloudinary-hosted images
    domains: ['localhost', 'res.cloudinary.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  },
  async headers() {
    // Get API URL from environment variable
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';
    // Extract the base URL (remove /api/v1 if present)
    const apiBaseUrl = apiUrl.replace(/\/api\/v1\/?$/, '');
    // Extract protocol and hostname for CSP
    let connectSrc = "'self' https: wss: ws:";
    
    // Add API URL to connect-src if it's not already covered
    if (apiBaseUrl) {
      try {
        const url = new URL(apiBaseUrl);
        // If API is HTTP (not HTTPS), add it explicitly
        if (url.protocol === 'http:') {
          connectSrc += ` ${url.protocol}//${url.hostname}${url.port ? ':' + url.port : ''}`;
        }
        // If API is HTTPS, it's already covered by 'https:'
      } catch (e) {
        // If URL parsing fails, allow localhost in development
        if (process.env.NODE_ENV === 'development') {
          connectSrc += ' http://localhost:*';
        }
      }
    } else if (process.env.NODE_ENV === 'development') {
      // Fallback for development
      connectSrc += ' http://localhost:*';
    }

    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // 'unsafe-eval' needed for Next.js
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              // Allow connections to same origin, HTTPS, WebSockets, and API URL
              `connect-src ${connectSrc}`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

