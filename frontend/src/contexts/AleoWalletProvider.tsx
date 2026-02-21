'use client';

import React, { useState, useEffect } from 'react';
import { AleoWalletProvider as ProvableWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import { Network } from '@provablehq/aleo-types';
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

const PROGRAM_ID = 'ghostswap_otc_v2.aleo';

// CRITICAL: Create wallet adapters as static singletons OUTSIDE component
// This prevents re-instantiation during Next.js App Router navigation
let WALLETS: (ShieldWalletAdapter | LeoWalletAdapter)[] | null = null;

function getWallets() {
  if (!WALLETS && typeof window !== 'undefined') {
    WALLETS = [
      new ShieldWalletAdapter(),
      new LeoWalletAdapter({ appName: 'GhostSwap' }),
    ];
  }
  return WALLETS || [];
}

interface WalletProviderProps {
  children: React.ReactNode;
}

export function AleoWalletProvider({ children }: WalletProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent SSR hydration issues - render children without provider until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ProvableWalletProvider
      wallets={getWallets()}
      decryptPermission={DecryptPermission.AutoDecrypt}
      programs={[PROGRAM_ID, 'credits.aleo']}
      network={Network.TESTNET}
      autoConnect
      localStorageKey="ghostswap-wallet"
    >
      <WalletModalProvider>{children}</WalletModalProvider>
    </ProvableWalletProvider>
  );
}
