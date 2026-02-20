'use client';

import { AleoWalletProvider } from '@/contexts/AleoWalletProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return <AleoWalletProvider>{children}</AleoWalletProvider>;
}
