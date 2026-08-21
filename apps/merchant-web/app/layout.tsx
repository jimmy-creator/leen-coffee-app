import type { Metadata } from 'next';
import { IBM_Plex_Sans_Arabic } from 'next/font/google';
import './globals.css';

// Loaded through next/font so the file is self-hosted and there is no
// render-blocking request to Google on first paint.
const plexArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-plex-arabic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Leen Merchant',
  description: 'Manage your roastery, catalogue and orders on Leen.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // English-first: this is an internal console, not the storefront.
  return (
    <html lang="en" dir="ltr" className={plexArabic.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
