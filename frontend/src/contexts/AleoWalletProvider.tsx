'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { AleoWalletProvider as ProvableWalletProvider, useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import { Network } from '@provablehq/aleo-types';
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

const PROGRAM_ID = 'ghostswap_otc_v2.aleo';
const STORAGE_KEY = 'ghostswap-wallet';
export const WALLET_NAME_KEY = 'ghostswap-wallet-name';

// ---------------------------------------------------------------------------
// CORE FIX: patch history.pushState / replaceState at module-load time.
//
// Shield Wallet fires a 'disconnect' event on every client-side URL change.
// The library responds to that event by wiping its state and showing the
// "CONNECT TO THIS SITE?" popup.
//
// We must set _suppressDisconnect = true SYNCHRONOUSLY at the moment
// history.pushState is called — which is what Next.js router calls when
// navigating. This is before any React re-render and before Shield can
// emit anything, so the patched adapter.emit() below drops the event
// before the library ever sees it.
//
// Using usePathname() was too late: its useEffect runs after the render
// that follows navigation, by which point Shield had already fired.
// ---------------------------------------------------------------------------
let _suppressDisconnect = false;
let _suppressTimer: ReturnType<typeof setTimeout> | null = null;

function openSuppressionWindow() {
  _suppressDisconnect = true;
  if (_suppressTimer) clearTimeout(_suppressTimer);
  _suppressTimer = setTimeout(() => { _suppressDisconnect = false; }, 800);
}

// Run once on the client when this module is first imported.
if (typeof window !== 'undefined') {
  const origPush = history.pushState.bind(history);
  history.pushState = (...args: Parameters<typeof history.pushState>) => {
    openSuppressionWindow();
    return origPush(...args);
  };

  const origReplace = history.replaceState.bind(history);
  history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
    openSuppressionWindow();
    return origReplace(...args);
  };

  // Back/forward browser buttons
  window.addEventListener('popstate', openSuppressionWindow);
}

// ---------------------------------------------------------------------------
// Wallet adapter singletons — created once, patched once.
// The emit() patch drops 'disconnect' while _suppressDisconnect is true.
// ---------------------------------------------------------------------------
let walletsInstance: (ShieldWalletAdapter | LeoWalletAdapter)[] | null = null;

function getWallets() {
  if (typeof window === 'undefined') return [];
  if (!walletsInstance) {
    const adapters: (ShieldWalletAdapter | LeoWalletAdapter)[] = [
      new ShieldWalletAdapter(),
      new LeoWalletAdapter({ appName: 'GhostSwap' }),
    ];

    for (const adapter of adapters) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orig = (adapter as any).emit.bind(adapter);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (adapter as any).emit = (event: string, ...args: unknown[]) => {
        if (event === 'disconnect' && _suppressDisconnect) {
          console.log('[GhostSwap] Dropped disconnect event during navigation');
          return false;
        }
        return orig(event, ...args);
      };
    }

    walletsInstance = adapters;
  }
  return walletsInstance;
}

// ---------------------------------------------------------------------------
// SessionBackup — keeps our own copy of the connected wallet name.
// The library may wipe STORAGE_KEY on a real disconnect; WALLET_NAME_KEY
// is only ever written (never deleted) by us.
// ---------------------------------------------------------------------------
function SessionBackup({ children }: { children: React.ReactNode }) {
  const { connected } = useWallet();

  useEffect(() => {
    if (!connected) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const name = typeof parsed === 'string'
        ? parsed
        : (parsed?.walletName ?? parsed?.name ?? null);
      if (name) localStorage.setItem(WALLET_NAME_KEY, name);
    } catch {/* ignore */}
  }, [connected]);

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------
interface WalletProviderProps {
  children: React.ReactNode;
}

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
        <SessionBackup>
          {children}
        </SessionBackup>
      </WalletModalProvider>
    </ProvableWalletProvider>
  );
}

export function AleoWalletProvider({ children }: WalletProviderProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return <>{children}</>;

  return <ClientWalletProvider>{children}</ClientWalletProvider>;
}
