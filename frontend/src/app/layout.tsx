import { Providers } from '@/components/providers/Providers';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RESTOGO Management System',
  description: 'RESTOGO – modern restaurant management system for bars, cafes, and restaurants',
  applicationName: 'RESTOGO',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: 'https://res.cloudinary.com/dy9yjhmex/image/upload/v1767085414/restogo-favicon_waa61k.png', type: 'image/png', sizes: '32x32' },
      { url: 'https://res.cloudinary.com/dy9yjhmex/image/upload/v1767085414/restogo-favicon_waa61k.png', type: 'image/png', sizes: '64x64' },
    ],
    shortcut: 'https://res.cloudinary.com/dy9yjhmex/image/upload/v1767085414/restogo-favicon_waa61k.png',
    apple: 'https://res.cloudinary.com/dy9yjhmex/image/upload/v1767085414/restogo-favicon_waa61k.png',
  },
};

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

