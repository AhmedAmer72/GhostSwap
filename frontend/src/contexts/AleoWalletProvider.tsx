'use client';

import React, { useEffect, useRef, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { AleoWalletProvider as ProvableWalletProvider, useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import { Network } from '@provablehq/aleo-types';
import { WalletName } from '@provablehq/aleo-wallet-standard';
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
// ROOT CAUSE of the popup-on-navigation bug:
//   Shield Wallet fires a native 'disconnect' event on every URL change.
//   Our code detected connected=false and immediately called selectWallet(),
//   which triggered the library's autoConnect effect → adapter.connect() →
//   Shield showed the "CONNECT TO THIS SITE?" confirmation popup.
//
// FIX:
//   Detect navigation with usePathname. When the path changes, set a 1.5 s
//   cooldown during which we suppress any reconnect attempt. Shield often
//   reconnects on its own within that window without needing our help (and
//   without showing a popup). If it does NOT reconnect within 1.5 s the
//   disconnect is genuine and we restore the session via selectWallet().
function WalletAutoConnect({ children }: { children: React.ReactNode }) {
  const { connected, connecting, selectWallet, wallets } = useWallet();
  const reconnectAttempted = useRef(false);
  // Track latest connected value inside callbacks without re-binding them.
  const connectedRef = useRef(connected);
  useEffect(() => { connectedRef.current = connected; }, [connected]);

  // Navigation cooldown: set to true when the path changes, cleared after 1.5 s.
  const pathname = usePathname();
  const navCooldown = useRef(false);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (pathname === prevPathname.current) return;
    prevPathname.current = pathname;

    // New page navigation: suppress reconnect for 1.5 s so Shield has time
    // to reconnect on its own (which it does silently, without a popup).
    navCooldown.current = true;
    reconnectAttempted.current = false;
    const t = setTimeout(() => { navCooldown.current = false; }, 1500);
    return () => clearTimeout(t);
  }, [pathname]);

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
      // Abort if: already attempted, wallet recovered on its own, or we're
      // still in the navigation cooldown window (avoid triggering the popup).
      if (reconnectAttempted.current || connectedRef.current || navCooldown.current) return;

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
        // library's autoConnect effect fires → adapter.connect() silently.
        selectWallet(savedAdapter.adapter.name as WalletName);
      }
    };

    // Immediate attempt (for non-navigation disconnects) + delayed fallback
    // that fires after the navCooldown window to handle the case where Shield
    // does NOT auto-reconnect on its own.
    attempt();
    const fallback = setTimeout(attempt, 1600);
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
