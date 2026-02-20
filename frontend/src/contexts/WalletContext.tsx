'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/utils/store';
import {
  isShieldWalletAvailable,
  connectShieldWallet,
  disconnectShieldWallet,
  getGhostTokenRecords,
} from '@/utils/aleo';

interface WalletContextType {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  publicKey: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  walletAvailable: boolean;
  error: string | null;
}

const WalletContext = createContext<WalletContextType>({
  isConnected: false,
  isConnecting: false,
  address: null,
  publicKey: null,
  connect: async () => {},
  disconnect: async () => {},
  walletAvailable: false,
  error: null,
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletAvailable, setWalletAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    connected,
    address,
    publicKey,
    setConnected,
    setBalances,
  } = useAppStore();

  // Check if Shield Wallet is available
  useEffect(() => {
    const checkWallet = () => {
      setWalletAvailable(isShieldWalletAvailable());
    };

    checkWallet();

    // Re-check after a delay (wallet might load after page)
    const timeout = setTimeout(checkWallet, 1000);
    
    // Listen for wallet injection
    window.addEventListener('load', checkWallet);
    
    return () => {
      clearTimeout(timeout);
      window.removeEventListener('load', checkWallet);
    };
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Check if wallet is available
      if (walletAvailable) {
        // Connect to real Shield Wallet
        const result = await connectShieldWallet();
        if (result) {
          setConnected(true, result.address, result.publicKey);
          
          // Fetch user's token records
          try {
            const records = await getGhostTokenRecords();
            console.log('User records:', records);
          } catch (e) {
            console.log('Could not fetch records:', e);
          }
          
          return;
        }
      }
      
      // No wallet available - show error
      throw new Error('No Aleo wallet detected. Please install Leo Wallet, Puzzle Wallet, or Shield Wallet extension.');
    } catch (err: any) {
      console.error('Connection failed:', err);
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, [walletAvailable, setConnected, setBalances]);

  const disconnect = useCallback(async () => {
    try {
      if (walletAvailable) {
        await disconnectShieldWallet();
      }
      setConnected(false);
    } catch (err: any) {
      console.error('Disconnect failed:', err);
    }
  }, [walletAvailable, setConnected]);

  return (
    <WalletContext.Provider
      value={{
        isConnected: connected,
        isConnecting,
        address,
        publicKey,
        connect,
        disconnect,
        walletAvailable,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
