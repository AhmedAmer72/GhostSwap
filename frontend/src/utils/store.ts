import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Token definitions for GhostSwap
export interface Token {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  tokenId: string; // Aleo field representation
  icon: string;
  color: string;
}

export const TOKENS: Token[] = [
  {
    id: 'credits',
    name: 'Aleo Credits',
    symbol: 'ALEO',
    decimals: 6,
    tokenId: '1field',
    icon: '◎',
    color: '#a855f7',
  },
  {
    id: 'usdcx',
    name: 'USDCx',
    symbol: 'USDCx',
    decimals: 6,
    tokenId: '2field',
    icon: '$',
    color: '#2775ca',
  },
  {
    id: 'usad',
    name: 'USAD',
    symbol: 'USAD',
    decimals: 6,
    tokenId: '3field',
    icon: '◈',
    color: '#00d395',
  },
  {
    id: 'weth',
    name: 'Wrapped Ethereum',
    symbol: 'wETH',
    decimals: 18,
    tokenId: '4field',
    icon: 'Ξ',
    color: '#627eea',
  },
  {
    id: 'wbtc',
    name: 'Wrapped Bitcoin',
    symbol: 'wBTC',
    decimals: 8,
    tokenId: '5field',
    icon: '₿',
    color: '#f7931a',
  },
];

// Trade Order for the link
export interface TradeOrder {
  orderId: string;
  makerAddress: string;
  makerToken: Token;
  makerAmount: string;
  takerToken: Token;
  takerAmount: string;
  nonce: string;
  expiresAt: number;
  createdAt: number;
  status: 'pending' | 'fulfilled' | 'cancelled' | 'expired';
}

// Global app state
interface AppState {
  // Wallet connection
  connected: boolean;
  address: string | null;
  publicKey: string | null;
  
  // User's token balances (mock for testnet)
  balances: Record<string, string>;
  
  // Active orders created by this user
  myOrders: TradeOrder[];
  
  // Transaction history
  transactions: {
    id: string;
    type: 'create_order' | 'execute_swap' | 'cancel_order' | 'generate_ticket' | 'mint';
    status: 'pending' | 'confirmed' | 'failed';
    timestamp: number;
    orderId?: string;
  }[];

  // UI State
  isLoading: boolean;
  error: string | null;

  // Actions
  setConnected: (connected: boolean, address?: string, publicKey?: string) => void;
  setBalances: (balances: Record<string, string>) => void;
  addOrder: (order: TradeOrder) => void;
  updateOrderStatus: (orderId: string, status: TradeOrder['status']) => void;
  addTransaction: (tx: AppState['transactions'][0]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  connected: false,
  address: null,
  publicKey: null,
  balances: {} as Record<string, string>, // populated from on-chain records via useTokenBalances
  myOrders: [],
  transactions: [],
  isLoading: false,
  error: null,
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      setConnected: (connected, address, publicKey) =>
        set({ connected, address: address || null, publicKey: publicKey || null }),

      setBalances: (balances) =>
        set({ balances }),

      addOrder: (order) =>
        set((state) => ({
          myOrders: [order, ...state.myOrders],
        })),

      updateOrderStatus: (orderId, status) =>
        set((state) => ({
          myOrders: state.myOrders.map((o) =>
            o.orderId === orderId ? { ...o, status } : o
          ),
        })),

      addTransaction: (tx) =>
        set((state) => ({
          transactions: [tx, ...state.transactions].slice(0, 50),
        })),

      setLoading: (isLoading) => set({ isLoading }),
      
      setError: (error) => set({ error }),

      reset: () => set(initialState),
    }),
    {
      name: 'ghostswap-storage',
      partialize: (state) => ({
        myOrders: state.myOrders,
        transactions: state.transactions,
      }),
    }
  )
);

// Utility functions
export function formatTokenAmount(amount: string, decimals: number): string {
  const num = BigInt(amount);
  const divisor = BigInt(10 ** decimals);
  const whole = num / divisor;
  const fraction = num % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 4);
  return `${whole.toLocaleString()}.${fractionStr}`;
}

export function parseTokenAmount(amount: string, decimals: number): string {
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return (BigInt(whole || '0') * BigInt(10 ** decimals) + BigInt(paddedFraction)).toString();
}

export function getTokenById(id: string): Token | undefined {
  return TOKENS.find((t) => t.id === id);
}

export function getTokenBySymbol(symbol: string): Token | undefined {
  return TOKENS.find((t) => t.symbol.toLowerCase() === symbol.toLowerCase());
}
