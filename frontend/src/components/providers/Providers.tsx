'use client';

import { SocketProvider } from '@/components/providers/SocketProvider';
import { restoreAuth } from '@/lib/slices/authSlice';
import { store } from '@/lib/store';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { Provider } from 'react-redux';

function AuthRestorer({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    store.dispatch(restoreAuth());
  }, []);

  return <>{children}</>;
}

function ClientOnlyToaster() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: '#333',
          color: '#fff',
        },
        success: {
          duration: 3000,
          iconTheme: {
            primary: '#22c55e',
            secondary: '#fff',
          },
        },
        error: {
          duration: 4000,
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fff',
          },
        },
      }}
    />
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthRestorer>
          <SocketProvider>
            {children}
            <ClientOnlyToaster />
          </SocketProvider>
        </AuthRestorer>
      </ThemeProvider>
    </Provider>
  );
}

