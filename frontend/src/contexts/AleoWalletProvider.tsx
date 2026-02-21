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
    // Reset the flag whenever we gain a connection so that a future
    // disconnect (e.g. brief drop during navigation) can trigger a fresh attempt.
    if (connected) {
      reconnectAttempted.current = false;
      return;
    }

    // Don't start a second attempt if one is already in flight.
    if (reconnectAttempted.current || connecting) return;

    const savedWallet = localStorage.getItem(STORAGE_KEY);
    if (!savedWallet) return;

    // Give the library's own autoConnect a head-start (500 ms) so the two
    // mechanisms don't race against each other.
    const timer = setTimeout(() => {
      // Re-check state after the delay – library may have reconnected by now.
      if (reconnectAttempted.current || connected) return;

      // Parse the stored wallet name – the library may store it as a plain
      // string OR as a JSON-encoded value.
      let walletName: string;
      try {
        const parsed = JSON.parse(savedWallet);
        walletName = typeof parsed === 'object' && parsed !== null
          ? parsed.walletName ?? parsed.name ?? String(parsed)
          : String(parsed);
      } catch {
        // Not valid JSON – treat the raw value as the wallet name.
        walletName = savedWallet;
      }

      if (!walletName) return;

      // Accept both 'Installed' (extension present) and 'Loadable' (can be
      // injected lazily) so we don't miss wallets during early page load.
      const savedAdapter = wallets.find(w => w.adapter.name === walletName);
      if (
        savedAdapter &&
        (savedAdapter.readyState === 'Installed' || savedAdapter.readyState === 'Loadable')
      ) {
        reconnectAttempted.current = true;
        console.log('[GhostSwap] Auto-reconnecting to:', walletName);
        selectWallet(savedAdapter.adapter.name);
        setTimeout(() => {
          connect(network || Network.TESTNET).catch(e =>
            console.log('[GhostSwap] Auto-connect failed:', e)
          );
        }, 100);
      }
    }, 500);

    return () => clearTimeout(timer);
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
