'use client';

import React, { useEffect, useRef } from 'react';
import { AleoWalletProvider as ProvableWalletProvider, useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import { Network } from '@provablehq/aleo-types';
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

const PROGRAM_ID = 'ghostswap_otc_v2.aleo';
const STORAGE_KEY = 'ghostswap-wallet';

// Static singleton wallet adapters - created once at module load
const shieldAdapter = new ShieldWalletAdapter();
const leoAdapter = new LeoWalletAdapter({ appName: 'GhostSwap' });
const WALLETS = [shieldAdapter, leoAdapter];

// Auto-reconnect component that runs inside the wallet context
function WalletAutoConnect({ children }: { children: React.ReactNode }) {
  const { connected, connecting, selectWallet, wallets, connect, network } = useWallet();
  const reconnectAttempted = useRef(false);

  useEffect(() => {
    // Only attempt reconnect once per mount
    if (reconnectAttempted.current || connected || connecting) return;

    const savedWallet = localStorage.getItem(STORAGE_KEY);
    if (savedWallet) {
      try {
        const walletData = JSON.parse(savedWallet);
        const walletName = walletData.walletName || walletData;
        
        // Find the saved wallet adapter
        const savedAdapter = wallets.find(w => w.adapter.name === walletName);
        if (savedAdapter && savedAdapter.readyState === 'Installed') {
          reconnectAttempted.current = true;
          console.log('[GhostSwap] Auto-reconnecting to:', walletName);
          selectWallet(savedAdapter.adapter.name);
          // Small delay to ensure selection is processed
          setTimeout(() => {
            connect(network || Network.TESTNET).catch(e => console.log('[GhostSwap] Auto-connect failed:', e));
          }, 100);
        }
      } catch (e) {
        console.log('[GhostSwap] Failed to parse saved wallet:', e);
      }
    }
  }, [connected, connecting, selectWallet, wallets, connect, network]);

  return <>{children}</>;
}

interface WalletProviderProps {
  children: React.ReactNode;
}

export function AleoWalletProvider({ children }: WalletProviderProps) {
  return (
    <ProvableWalletProvider
      wallets={WALLETS}
      decryptPermission={DecryptPermission.AutoDecrypt}
      programs={[PROGRAM_ID, 'credits.aleo']}
      network={Network.TESTNET}
      autoConnect
      localStorageKey={STORAGE_KEY}
    >
      <WalletModalProvider>
        <WalletAutoConnect>
          {children}
        </WalletAutoConnect>
      </WalletModalProvider>
    </ProvableWalletProvider>
  );
}
