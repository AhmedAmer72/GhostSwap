'use client';

/**
 * AleoWalletProvider — modelled after CloakStamp's ChainProvider.
 *
 * Key design decisions (matching CloakStamp):
 *  1. Adapter singleton at module level — created exactly once, never
 *     re-instantiated on re-renders or client-side navigations.
 *  2. Rendered unconditionally — no mounted/SSR gating that tears down
 *     and recreates the provider on first paint.
 *  3. autoConnect handles reconnection — no explicit connect() calls.
 *
 * Shield Wallet fires a 'disconnect' event on every URL change, which
 * causes the library to clear its own localStorage key (STORAGE_KEY).
 * SessionGuard handles this transparently via a backup key (WALLET_NAME_KEY)
 * that the library never touches.
 */

import React, { useMemo, useEffect, useRef } from 'react';
import {
  AleoWalletProvider as ProvableWalletProvider,
  useWallet,
} from '@provablehq/aleo-wallet-adaptor-react';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import { Network } from '@provablehq/aleo-types';
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

const PROGRAM_ID = 'ghostswap_otc_v2.aleo';
const STORAGE_KEY = 'ghostswap-wallet';     // owned by the @provablehq library
const WALLET_NAME_KEY = 'ghostswap-wallet-name'; // our backup – library never touches this

// ─── Adapter singleton ──────────────────────────────────────────────────────
// Created once at module-load time (client-only via window guard), matching
// CloakStamp's useMemo pattern but hoisted to module scope so it truly
// survives hot-reloads and re-renders.
let _wallets: (ShieldWalletAdapter | LeoWalletAdapter)[] | null = null;
function getWallets() {
  if (typeof window === 'undefined') return []; // SSR guard
  return (_wallets ??= [
    new ShieldWalletAdapter(),
    new LeoWalletAdapter({ appName: 'GhostSwap' }),
  ]);
}

// ─── SessionGuard ────────────────────────────────────────────────────────────
// Minimal guard for Shield Wallet's navigate-fires-disconnect quirk.
// Connected   → backs up wallet name to WALLET_NAME_KEY.
// Disconnected → restores STORAGE_KEY from backup + calls selectWallet().
// selectWallet() = library's setName(); changes adapter → triggers library's
// own autoConnect effect → silent reconnect, no popup.
function SessionGuard({ children }: { children: React.ReactNode }) {
  const { connected, connecting, selectWallet, wallets } = useWallet();
  const restoring = useRef(false);

  // When connected: persist wallet name to our backup key.
  useEffect(() => {
    if (!connected) return;
    restoring.current = false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const name = typeof parsed === 'string'
        ? parsed
        : (parsed?.walletName ?? parsed?.name ?? null);
      if (name) localStorage.setItem(WALLET_NAME_KEY, name);
    } catch { /* ignore */ }
  }, [connected]);

  // When disconnected: restore from backup and re-select wallet.
  useEffect(() => {
    if (connected || restoring.current || connecting) return;
    const walletName = localStorage.getItem(WALLET_NAME_KEY);
    if (!walletName) return;

    const restore = () => {
      if (restoring.current || connected) return;
      const found = wallets.find(w => w.adapter.name === walletName);
      if (found && (found.readyState === 'Installed' || found.readyState === 'Loadable')) {
        restoring.current = true;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(walletName));
        selectWallet(walletName);
      }
    };

    restore();
    const t = setTimeout(restore, 200); // fallback for slow injections
    return () => clearTimeout(t);
  }, [connected, connecting, selectWallet, wallets]);

  return <>{children}</>;
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function AleoWalletProvider({ children }: { children: React.ReactNode }) {
  // useMemo with empty deps = computed once per mount. Since this component
  // lives in the root layout (never re-mounts on navigation in Next.js App
  // Router), this is effectively a singleton — identical to CloakStamp's
  // module-level adapter approach.
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
        <SessionGuard>
          {children}
        </SessionGuard>
      </WalletModalProvider>
    </ProvableWalletProvider>
  );
}
