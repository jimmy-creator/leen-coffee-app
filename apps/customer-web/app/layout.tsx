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
  title: 'Leen Coffee — Saudi specialty coffee',
  description:
    'One basket across dozens of independent Saudi roasters. Roast dates shown before you buy.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Arabic-first, matching the apps: `defaultLocale` in @leen/i18n is 'ar'.
  return (
    <html lang="ar" dir="rtl" className={plexArabic.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
