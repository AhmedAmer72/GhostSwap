'use client';

import React, { useMemo } from 'react';
import { AleoWalletProvider as ProvableWalletProvider } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import { Network } from '@provablehq/aleo-types';
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

const PROGRAM_ID = 'ghostswap_otc_v2.aleo';

interface WalletProviderProps {
  children: React.ReactNode;
}

export function AleoWalletProvider({ children }: WalletProviderProps) {
  const wallets = useMemo(
    () => [
      new ShieldWalletAdapter(),
      new LeoWalletAdapter({ appName: 'GhostSwap' }),
    ],
    []
  );

  return (
    <ProvableWalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.AutoDecrypt}
      programs={[PROGRAM_ID, 'credits.aleo']}
      network={Network.TESTNET}
      autoConnect
    >
      <WalletModalProvider>{children}</WalletModalProvider>
    </ProvableWalletProvider>
  );
}
