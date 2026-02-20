'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore, TOKENS, formatTokenAmount } from '@/utils/store';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { TokenIcon } from './TokenSelector';
import { Coins, RefreshCw, Plus } from 'lucide-react';

export function TokenBalances() {
  const { connected: isConnected } = useWallet();
  const { balances } = useAppStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise((r) => setTimeout(r, 1000));
    setIsRefreshing(false);
  };

  if (!isConnected) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-white/60" />
          <h3 className="font-semibold text-white">Your Balances</h3>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 rounded-lg hover:bg-white/5 transition-colors"
        >
          <RefreshCw 
            className={`w-4 h-4 text-white/40 ${isRefreshing ? 'animate-spin' : ''}`} 
          />
        </button>
      </div>

      <div className="space-y-3">
        {TOKENS.map((token) => {
          const balance = balances[token.id] || '0';
          const formatted = formatTokenAmount(balance, token.decimals);

          return (
            <div
              key={token.id}
              className="flex items-center justify-between p-3 rounded-xl glass-light border border-white/5"
            >
              <div className="flex items-center gap-3">
                <TokenIcon token={token} size="sm" />
                <div>
                  <p className="font-medium text-white">{token.symbol}</p>
                  <p className="text-xs text-white/40">{token.name}</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="font-mono text-white">{formatted}</p>
                <p className="text-xs text-white/40">${(parseFloat(formatted) * getTokenPrice(token.id)).toFixed(2)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mint Button (Testnet) */}
      <button
        className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span className="text-sm">Mint Test Tokens</span>
      </button>
    </motion.div>
  );
}

// Mock price function for demo
function getTokenPrice(tokenId: string): number {
  const prices: Record<string, number> = {
    credits: 0.5,
    usdcx: 1.0,
    usad: 1.0,
    weth: 3500,
    wbtc: 65000,
  };
  return prices[tokenId] || 0;
}
