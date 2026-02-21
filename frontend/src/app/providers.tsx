'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Dynamically import the wallet provider with SSR disabled
const AleoWalletProvider = dynamic(
  () => import('@/contexts/AleoWalletProvider').then(mod => ({ default: mod.AleoWalletProvider })),
  { ssr: false }
);

export function Providers({ children }: { children: React.ReactNode }) {
  return <AleoWalletProvider>{children}</AleoWalletProvider>;
}
