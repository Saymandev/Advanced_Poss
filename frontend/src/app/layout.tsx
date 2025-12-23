import { Providers } from '@/components/providers/Providers';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'RESTOGO Management System',
  description: 'RESTOGO – modern restaurant management system for bars, cafes, and restaurants',
  applicationName: 'RESTOGO',
  icons: {
    icon: '/restogo-favicon.png',
    shortcut: '/restogo-favicon.png',
    apple: '/restogo-favicon.png',
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

