import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV !== 'production';

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline'",
  // Profile photos come from LinkedIn's CDN; project images can be any https URL.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  `connect-src 'self'${isDev ? ' ws:' : ''}`,
  "frame-ancestors 'self'",
  // Sign-in posts a form that redirects to LinkedIn's consent screen.
  "form-action 'self' https://www.linkedin.com",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  // Lets the e2e server build into its own folder while `npm run dev` is running.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  serverExternalPackages: ['@react-pdf/renderer', 'pdfjs-dist'],
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
