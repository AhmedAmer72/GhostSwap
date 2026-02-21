'use client';

import { useContext } from 'react';
import { WalletContext } from '@provablehq/aleo-wallet-adaptor-react';

// Safe wallet hook that returns null values when context is unavailable
// This prevents crashes during SSR or when outside provider
export function useWalletSafe() {
  try {
    const context = useContext(WalletContext);
    if (!context) {
      return {
        address: null,
        connected: false,
        connecting: false,
        disconnect: async () => {},
        connect: async () => {},
        wallet: null,
        wallets: [],
        select: () => {},
        executeTransaction: async () => ({ success: false }),
        isAvailable: false,
      };
    }
    return { ...context, isAvailable: true };
  } catch {
    return {
      address: null,
      connected: false,
      connecting: false,
      disconnect: async () => {},
      connect: async () => {},
      wallet: null,
      wallets: [],
      select: () => {},
      executeTransaction: async () => ({ success: false }),
      isAvailable: false,
    };
  }
}
