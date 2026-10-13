'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

import './globals.css';

export default function RootLayout({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient());

  return (
    <html lang="es">
      <body>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </body>
    </html>
  );
}
