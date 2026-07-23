import { Providers } from '@/components/providers/Providers';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

import { headers } from 'next/headers';

export async function generateMetadata(): Promise<Metadata> {
  let appName = 'Raha Pos Solutions';
  let faviconUrl = 'https://res.cloudinary.com/dy9yjhmex/image/upload/v1767085414/restogo-favicon_waa61k.png';
  
  try {
    const headersList = headers();
    const host = headersList.get('host') || '';
    const domainOnly = host.split(':')[0];
    const isMainDomain = host.includes('raha.bd') || 
                         host.includes('localhost') || 
                         host.includes('127.0.0.1') || 
                         host.match(/^192\.168\./) ||
                         host.match(/^10\./) ||
                         host.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./);

    if (!isMainDomain && host) {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const res = await fetch(`${apiUrl}/public/resolve-domain?domain=${domainOnly}`, { cache: 'no-store' });
        if (res.ok) {
           const result = await res.json();
           if (result.success && result.data) {
             appName = result.data.name || appName;
             faviconUrl = result.data.favicon || faviconUrl;
           }
        }
      } catch (e) {
        // Fallback
        const domainPart = host.split('.')[0];
        if (domainPart) {
          appName = domainPart.charAt(0).toUpperCase() + domainPart.slice(1);
        }
      }
    }
  } catch (error) {
    // Fallback for static generation where headers() is unavailable
  }

  return {
    title: appName,
    description: `${appName} – modern restaurant management system for bars, cafes, restaurants and Hotels`,
    applicationName: appName,
    manifest: '/manifest.json',
    icons: {
      icon: [
        { url: faviconUrl, type: 'image/png', sizes: '32x32' },
        { url: faviconUrl, type: 'image/png', sizes: '64x64' },
      ],
      shortcut: faviconUrl,
      apple: faviconUrl,
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

