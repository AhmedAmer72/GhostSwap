'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import { AleoWalletProvider as ProvableWalletProvider, useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import { Network } from '@provablehq/aleo-types';
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

const PROGRAM_ID = 'ghostswap_otc_v2.aleo';
// Key used by the @provablehq library itself (it clears this on disconnect).
const STORAGE_KEY = 'ghostswap-wallet';
// Our own backup key — the library NEVER touches this, so it survives the
// library clearing STORAGE_KEY when the wallet adapter fires 'disconnect'.
const WALLET_NAME_KEY = 'ghostswap-wallet-name';

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

// Auto-reconnect component that runs inside the wallet context.
//
// ROOT CAUSE of the disconnect-on-navigation bug:
//   The Shield Wallet adapter fires a 'disconnect' event on URL change.
//   The library's handleDisconnect() calls setName(null), which wipes
//   STORAGE_KEY from localStorage.  Our previous reconnect code read from
//   STORAGE_KEY — so after the library cleared it, reconnect found nothing
//   and silently gave up.
//
// FIX: persist the wallet name under WALLET_NAME_KEY (our own key). That key
// is never touched by the library. On every disconnect we restore STORAGE_KEY
// from the backup and call selectWallet + connect.
function WalletAutoConnect({ children }: { children: React.ReactNode }) {
  const { connected, connecting, selectWallet, wallets, connect, network } = useWallet();
  const reconnectAttempted = useRef(false);

  useEffect(() => {
    if (connected) {
      // We are connected — save the wallet name to our backup key.
      // The library stores the name in STORAGE_KEY as JSON.stringify(name).
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const name = typeof parsed === 'string' ? parsed : (parsed?.walletName ?? parsed?.name ?? null);
          if (name) localStorage.setItem(WALLET_NAME_KEY, name);
        }
      } catch {/* ignore */}
      // Reset guard so a future disconnect triggers a fresh attempt.
      reconnectAttempted.current = false;
      return;
    }

    if (reconnectAttempted.current || connecting) return;

    // Read the wallet name from OUR backup key (never cleared by the library).
    const walletName = localStorage.getItem(WALLET_NAME_KEY);
    if (!walletName) return;

    const attempt = () => {
      if (reconnectAttempted.current || connected) return;

      const savedAdapter = wallets.find(w => w.adapter.name === walletName);
      if (
        savedAdapter &&
        (savedAdapter.readyState === 'Installed' || savedAdapter.readyState === 'Loadable')
      ) {
        reconnectAttempted.current = true;
        // Restore the library's own key so its internal autoConnect logic
        // also sees the wallet name on subsequent renders.
        localStorage.setItem(STORAGE_KEY, JSON.stringify(walletName));
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
    // Fallback for slower wallet injections
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
  // Use a mounted flag to avoid SSR/hydration mismatch: getWallets() returns []
  // on the server but creates adapters on the client.  The layout never
  // re-mounts on navigation (Next.js App Router), so ClientWalletProvider stays
  // alive for the entire session once it mounts.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-mount: render children so the page layout is visible immediately.
  // The wallet button shows its loading/connect state handled by WalletButton.
  if (!mounted) return <>{children}</>;

  return <ClientWalletProvider>{children}</ClientWalletProvider>;
}
