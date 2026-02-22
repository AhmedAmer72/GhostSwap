'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TOKENS, formatTokenAmount } from '@/utils/store';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { TokenIcon } from './TokenSelector';
import { useTokenBalances, useAleoTrade } from '@/hooks/useAleoTrade';
import { parseTokenAmount } from '@/utils/store';
import { Coins, RefreshCw, Plus, X, Loader2 } from 'lucide-react';

export function TokenBalances() {
  const { connected: isConnected } = useWallet();
  const { balances, isLoading: isRefreshing, refreshBalances } = useTokenBalances();
  const { mintTokens, isProcessing: isMinting } = useAleoTrade();

  const [showMintModal, setShowMintModal] = useState(false);
  const [mintTokenId, setMintTokenId] = useState(TOKENS[0].id);
  const [mintAmount, setMintAmount] = useState('1000');
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintSuccess, setMintSuccess] = useState(false);

  const handleMint = async () => {
    setMintError(null);
    setMintSuccess(false);
    try {
      const token = TOKENS.find(t => t.id === mintTokenId);
      if (!token) throw new Error('Unknown token');
      const amountBase = parseTokenAmount(mintAmount, token.decimals);
      // tokenId field value is like '1field' — strip 'field' suffix for mint_tokens
      const tokenIdNum = token.tokenId.replace('field', '').trim();
      await mintTokens(tokenIdNum, amountBase);
      setMintSuccess(true);
      // Refresh balances after minting
      setTimeout(() => {
        refreshBalances();
        setShowMintModal(false);
        setMintSuccess(false);
      }, 1500);
    } catch (err: any) {
      setMintError(err.message || 'Mint failed');
    }
  };

  if (!isConnected) return null;

  return (
    <>
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
            onClick={refreshBalances}
            disabled={isRefreshing}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
            title="Refresh balances"
          >
            <RefreshCw
              className={`w-4 h-4 text-white/40 ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
        </div>

        <div className="space-y-3">
          {TOKENS.map((token) => {
            const balance = balances[token.tokenId] || balances[token.id] || '0';
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
                  <p className="text-xs text-white/40">
                    ${(parseFloat(formatted.replace(/,/g, '')) * getTokenPrice(token.id)).toFixed(2)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mint Test Tokens (Testnet) */}
        <button
          onClick={() => setShowMintModal(true)}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="text-sm">Mint Test Tokens</span>
        </button>
      </motion.div>

      {/* Mint Modal */}
      <AnimatePresence>
        {showMintModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowMintModal(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-sm"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Mint Test Tokens</h3>
                <button onClick={() => setShowMintModal(false)} className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-sm text-white/50 mb-4">
                Mint GhostSwap test tokens on Aleo testnet. These are only usable within the GhostSwap program.
              </p>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs text-white/50 mb-1">Token</label>
                  <select
                    value={mintTokenId}
                    onChange={(e) => setMintTokenId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg glass-light border border-white/5 text-white bg-transparent outline-none"
                  >
                    {TOKENS.map(t => (
                      <option key={t.id} value={t.id} className="bg-gray-900">{t.symbol} — {t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-white/50 mb-1">Amount</label>
                  <input
                    type="number"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                    placeholder="1000"
                    className="w-full px-3 py-2 rounded-lg glass-light border border-white/5 text-white placeholder-white/30 outline-none"
                  />
                </div>
              </div>

              {mintError && (
                <p className="text-red-400 text-sm mb-3">{mintError}</p>
              )}
              {mintSuccess && (
                <p className="text-emerald-400 text-sm mb-3">Minted! Transaction submitted.</p>
              )}

              <button
                onClick={handleMint}
                disabled={isMinting || !mintAmount}
                className="w-full btn-primary py-3 flex items-center justify-center gap-2"
              >
                {isMinting ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Minting...</span></>
                ) : (
                  <><Plus className="w-4 h-4" /><span>Mint Tokens</span></>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

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
