'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
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
// THE FIX
//
// Shield Wallet fires a 'disconnect' event on every client-side navigation.
// Every previous approach tried to *react* to that disconnect (cooldowns,
// selectWallet calls, etc.) and all of them eventually called adapter.connect()
// which made Shield show the "CONNECT TO THIS SITE?" popup.
//
// The correct fix: intercept Shield's 'disconnect' event at the adapter level
// and DROP it during a short window after navigation. The library never sees
// the disconnect -> never wipes state -> never calls connect() -> no popup.
// ---------------------------------------------------------------------------

// Module-level flag read by the patched adapter emit().
let _suppressDisconnect = false;
let _suppressTimer: ReturnType<typeof setTimeout> | null = null;

function startNavigationWindow() {
  _suppressDisconnect = true;
  if (_suppressTimer) clearTimeout(_suppressTimer);
  // 600 ms is enough for Shield to fire and finish its disconnect event.
  _suppressTimer = setTimeout(() => { _suppressDisconnect = false; }, 600);
}

// Wallet adapter singletons — created once, patched once.
let walletsInstance: (ShieldWalletAdapter | LeoWalletAdapter)[] | null = null;

function getWallets() {
  if (typeof window === 'undefined') return [];
  if (!walletsInstance) {
    const adapters: (ShieldWalletAdapter | LeoWalletAdapter)[] = [
      new ShieldWalletAdapter(),
      new LeoWalletAdapter({ appName: 'GhostSwap' }),
    ];

    // Patch each adapter: swallow 'disconnect' events while _suppressDisconnect is true.
    for (const adapter of adapters) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const orig = (adapter as any).emit.bind(adapter);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (adapter as any).emit = (event: string, ...args: unknown[]) => {
        if (event === 'disconnect' && _suppressDisconnect) {
          console.log('[GhostSwap] Navigation detected — dropping wallet disconnect event');
          return false;
        }
        return orig(event, ...args);
      };
    }

    walletsInstance = adapters;
  }
  return walletsInstance;
}

// NavigationGuard — runs inside React tree to access usePathname.
// Calls startNavigationWindow() on every path change so the suppress
// window is open before Shield fires its disconnect event.
function NavigationGuard() {
  const pathname = usePathname();
  const prev = useRef(pathname);

  useEffect(() => {
    if (pathname === prev.current) return;
    prev.current = pathname;
    startNavigationWindow();
  }, [pathname]);

  return null;
}

// SessionBackup — saves wallet name to our own key whenever connected.
// This survives if the library ever wipes its own key on a real disconnect.
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
    } catch {}
  }, [connected]);

  return <>{children}</>;
}

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
        <NavigationGuard />
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
