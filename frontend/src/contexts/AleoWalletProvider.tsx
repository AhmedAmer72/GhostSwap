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
//   Shield Wallet fires a native 'disconnect' event on every URL change.
//   The library's handleDisconnect() calls setName(null) which wipes
//   STORAGE_KEY from localStorage.  Our reconnect code was reading from
//   STORAGE_KEY — by the time it ran, the library had already cleared it.
//
// FIX:
//   1. Back up the wallet name to WALLET_NAME_KEY (our own key the library
//      never touches) whenever we are connected.
//   2. On disconnect, restore STORAGE_KEY from the backup and call
//      selectWallet() ONLY — do NOT call connect() explicitly.
//      selectWallet() = setName() inside the library; it restores the adapter
//      and triggers the library's own autoConnect effect which calls
//      adapter.connect() silently (no popup for already-authorised dApps).
//      Calling connect() on top of autoConnect was what opened the popup.
function WalletAutoConnect({ children }: { children: React.ReactNode }) {
  const { connected, connecting, selectWallet, wallets } = useWallet();
  const reconnectAttempted = useRef(false);

  useEffect(() => {
    if (connected) {
      // Back up the wallet name under our own key.
      // The library stores it in STORAGE_KEY as JSON.stringify(walletName).
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          const name = typeof parsed === 'string'
            ? parsed
            : (parsed?.walletName ?? parsed?.name ?? null);
          if (name) localStorage.setItem(WALLET_NAME_KEY, name);
        }
      } catch {/* ignore */}
      reconnectAttempted.current = false;
      return;
    }

    if (reconnectAttempted.current || connecting) return;

    // Read from our backup key — intact even after the library wiped STORAGE_KEY.
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
        // Restore library's key first so its autoConnect effect sees the name.
        localStorage.setItem(STORAGE_KEY, JSON.stringify(walletName));
        console.log('[GhostSwap] Restoring wallet session:', walletName);
        // selectWallet() updates library state → adapter changes →
        // library's autoConnect effect fires → adapter.connect() (silent,
        // no popup for already-authorised apps).
        selectWallet(savedAdapter.adapter.name);
        // Do NOT call connect() here — autoConnect handles it.
      }
    };

    attempt();
    const fallback = setTimeout(attempt, 300);
    return () => clearTimeout(fallback);
  }, [connected, connecting, selectWallet, wallets]);

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
