import type { NextConfig } from 'next';

const config: NextConfig = {
  // Workspace packages ship as ESM TypeScript builds; Next has to compile them
  // rather than treat them as pre-built CommonJS dependencies.
  transpilePackages: ['@leen/ui', '@leen/i18n', '@leen/lib', '@leen/types', '@leen/api-client'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
};

export default config;
