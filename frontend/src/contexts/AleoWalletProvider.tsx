'use client';

import React, { useEffect, useRef, useMemo } from 'react';
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
    // Reset the guard whenever we gain a connection so a future drop can
    // trigger a fresh attempt.
    if (connected) {
      reconnectAttempted.current = false;
      return;
    }

    // Don't start a second attempt if one is already in flight.
    if (reconnectAttempted.current || connecting) return;

    const savedWallet = localStorage.getItem(STORAGE_KEY);
    if (!savedWallet) return;

    // Try immediately; also schedule a fallback 300 ms later in case the
    // wallet adapter hasn't finished injecting yet.
    const attempt = () => {
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
        walletName = savedWallet;
      }

      if (!walletName) return;

      // Accept 'Installed' and 'Loadable' so lazily-injected wallets aren't skipped.
      const savedAdapter = wallets.find(w => w.adapter.name === walletName);
      if (
        savedAdapter &&
        (savedAdapter.readyState === 'Installed' || savedAdapter.readyState === 'Loadable' || savedAdapter.readyState === 'NotDetected')
      ) {
        reconnectAttempted.current = true;
        console.log('[GhostSwap] Auto-reconnecting to:', walletName);
        selectWallet(savedAdapter.adapter.name);
        setTimeout(() => {
          connect(network || Network.TESTNET).catch(e =>
            console.log('[GhostSwap] Auto-connect failed:', e)
          );
        }, 50);
      }
    };

    // Immediate attempt
    attempt();
    // Fallback attempt after 300 ms for slower wallet injections
    const fallback = setTimeout(attempt, 300);
    return () => clearTimeout(fallback);
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
  // Always render ClientWalletProvider so the wallet context is never
  // conditionally absent. getWallets() already returns [] during SSR,
  // so the adapter list is empty on the server and hydrates correctly.
  return <ClientWalletProvider>{children}</ClientWalletProvider>;
}
