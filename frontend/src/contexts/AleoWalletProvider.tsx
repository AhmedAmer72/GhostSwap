'use client';

import React, { useEffect, useRef, useState, useMemo, createContext, useContext } from 'react';
import { AleoWalletProvider as ProvableWalletProvider, useWallet, WalletContext as ProvableWalletContext } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import { Network } from '@provablehq/aleo-types';
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

const PROGRAM_ID = 'ghostswap_otc_v2.aleo';
const STORAGE_KEY = 'ghostswap-wallet';

// Lazy wallet adapter initialization - only created once on client
let walletsInstance: (ShieldWalletAdapter | LeoWalletAdapter)[] | null = null;

function getWallets() {
  if (typeof window === 'undefined') return [];
  if (!walletsInstance) {
    walletsInstance = [
      new ShieldWalletAdapter(),
      new LeoWalletAdapter({ appName: 'GhostSwap' }),
    ];
  }
  return walletsInstance;
}

// Auto-reconnect component that runs inside the wallet context
function WalletAutoConnect({ children }: { children: React.ReactNode }) {
  const { connected, connecting, selectWallet, wallets, connect, network } = useWallet();
  const reconnectAttempted = useRef(false);

  useEffect(() => {
    // Only attempt reconnect once per session
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

// Internal provider that renders only on client
function ClientWalletProvider({ children }: WalletProviderProps) {
  const wallets = useMemo(() => getWallets(), []);

  return (
    <ProvableWalletProvider
      wallets={wallets}
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

export function AleoWalletProvider({ children }: WalletProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // During SSR or before mount, render children without wallet context
  // This allows the page to render, then wallet loads on client
  if (!mounted) {
    return <>{children}</>;
  }

  return <ClientWalletProvider>{children}</ClientWalletProvider>;
}
