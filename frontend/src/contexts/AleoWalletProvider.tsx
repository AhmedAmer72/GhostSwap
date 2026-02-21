'use client';

/**
 * AleoWalletProvider — modelled after CloakStamp's ChainProvider.
 *
 * Key design decisions:
 *  1. Adapter singleton at module level — created exactly once.
 *  2. Rendered unconditionally — no mounted/SSR gating.
 *  3. autoConnect handles reconnection — no explicit connect() calls.
 *
 * Shield Wallet fires 'disconnect' on every URL change, which causes the
 * library to wipe its own localStorage key (STORAGE_KEY). SessionGuard
 * handles this via WALLET_NAME_KEY that the library never touches.
 */

import React, { useMemo, useEffect, useRef } from 'react';
import {
  AleoWalletProvider as ProvableWalletProvider,
  useWallet,
} from '@provablehq/aleo-wallet-adaptor-react';
import { WalletName } from '@provablehq/aleo-wallet-adaptor-core';
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { ShieldWalletAdapter } from '@provablehq/aleo-wallet-adaptor-shield';
import { LeoWalletAdapter } from '@provablehq/aleo-wallet-adaptor-leo';
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core';
import { Network } from '@provablehq/aleo-types';
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css';

const PROGRAM_ID = 'ghostswap_otc_v2.aleo';
const STORAGE_KEY = 'ghostswap-wallet';
const WALLET_NAME_KEY = 'ghostswap-wallet-name';

// Adapter singleton — created once, survives re-renders and navigations
let _wallets: (ShieldWalletAdapter | LeoWalletAdapter)[] | null = null;
function getWallets() {
  if (typeof window === 'undefined') return [];
  return (_wallets ??= [
    new ShieldWalletAdapter(),
    new LeoWalletAdapter({ appName: 'GhostSwap' }),
  ]);
}

// SessionGuard — backs up wallet name on connect; restores on disconnect.
// Uses selectWallet() only (no connect()), so the library's own autoConnect
// fires the actual reconnect silently without opening a popup.
function SessionGuard({ children }: { children: React.ReactNode }) {
  const { connected, connecting, selectWallet, wallets } = useWallet();
  const restoring = useRef(false);

  useEffect(() => {
    restoring.current = false;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = JSON.parse(raw);
      const name = typeof parsed === 'string'
        ? parsed
        : (parsed?.walletName ?? parsed?.name ?? null);
      if (name) localStorage.setItem(WALLET_NAME_KEY, name);
    } catch { /* ignore */ }
  }, [connected]);

  useEffect(() => {
    if (connected || restoring.current || connecting) return;
    const walletName = localStorage.getItem(WALLET_NAME_KEY);

    const restore = () => {
      if (restoring.current || connected) return;
      const found = wallets.find(w => w.adapter.name === walletName);
      if (found && (found.readyState === 'Installed' || found.readyState === 'Loadable')) {
        restoring.current = true;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(walletName));
        selectWallet(walletName as WalletName);
      }
    };

    restore();
    const t = setTimeout(restore, 200);
    return () => clearTimeout(t);
  }, [connected, connecting, selectWallet, wallets]);

  return <>{children}</>;
}

export function AleoWalletProvider({ children }: { children: React.ReactNode }) {
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
