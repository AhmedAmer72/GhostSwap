'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { TradeOrder, Token, TOKENS, useAppStore, formatTokenAmount, parseTokenAmount } from '@/utils/store';
import { extractLinkData, decodeTradeLink, validateTradeOrder, shortenAddress, getTimeRemaining } from '@/utils/crypto';
import { useAleoTrade } from '@/hooks/useAleoTrade';
import { TokenIcon } from './TokenSelector';
import {
  ArrowRight,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle2,
  Ghost,
  Sparkles,
  Lock,
  ExternalLink,
  Link2,
  Loader2,
  XCircle,
} from 'lucide-react';

interface ClaimTradeProps {
  linkData?: string;
}

export function ClaimTrade({ linkData }: ClaimTradeProps) {
  const { connected: isConnected, address } = useWallet();
  const { balances, setLoading, isLoading } = useAppStore();
  const { executeTrade, isProcessing } = useAleoTrade();

  const [inputLink, setInputLink] = useState('');
  const [trade, setTrade] = useState<TradeOrder | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'decrypted' | 'confirming' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Decode link when linkData changes or on submit
  useEffect(() => {
    if (linkData) {
      handleDecryptLink(linkData);
    }
  }, [linkData]);

  const handleDecryptLink = async (data: string) => {
    setStatus('loading');
    setError(null);

    try {
      // Small delay so the loading animation is visible
      await new Promise((r) => setTimeout(r, 600));

      // Decode the link using the real crypto module
      const decoded = decodeTradeLink(data, TOKENS);
      if (!decoded) {
        throw new Error('Failed to decode link — the link may be invalid or corrupted.');
      }

      const validation = validateTradeOrder(decoded);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      setTrade(decoded);
      setStatus('decrypted');
    } catch (err: any) {
      console.error('Failed to decode link:', err);
      setError(err.message || 'Failed to decode trade link');
      setStatus('error');
    }
  };

  const handleSubmitLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputLink.trim()) return;

    const data = extractLinkData(inputLink.trim());
    if (data) {
      handleDecryptLink(data);
    } else {
      setError('Invalid link format. Please check and try again.');
      setStatus('error');
    }
  };

  const handleAcceptTrade = async () => {
    if (!trade || !isConnected) return;

    setStatus('confirming');
    setError(null);

    try {
      const takerAmountBase = parseTokenAmount(
        formatTokenAmount(trade.takerAmount, trade.takerToken.decimals),
        trade.takerToken.decimals
      );

      await executeTrade(trade, trade.takerToken, takerAmountBase);
      setStatus('success');
    } catch (err: any) {
      console.error('Failed to execute swap:', err);
      setError(err.message || 'Failed to execute swap');
      setStatus('error');
    }
  };

  const handleReset = () => {
    setInputLink('');
    setTrade(null);
    setStatus('idle');
    setError(null);
  };

  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card glow"
      >
        <AnimatePresence mode="wait">
            {/* Success State */}
            {status === 'success' && trade && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-6"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-phantom-500/20 border border-emerald-500/30 mb-6"
                >
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </motion.div>

                <h3 className="text-2xl font-bold text-white mb-2">
                  Swap Complete! 🎉
                </h3>
                <p className="text-white/50 mb-6">
                  Your tokens have been privately swapped
                </p>

                {/* Receipt */}
                <div className="p-4 rounded-xl glass-light border border-emerald-500/20 mb-6">
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <p className="text-xs text-white/40 mb-1">You Sent</p>
                      <div className="flex items-center gap-2">
                        <TokenIcon token={trade.takerToken} size="sm" />
                        <span className="font-bold text-white">
                          {formatTokenAmount(trade.takerAmount, trade.takerToken.decimals)} {trade.takerToken.symbol}
                        </span>
                      </div>
                    </div>
                    
                    <ArrowRight className="w-5 h-5 text-emerald-400" />
                    
                    <div className="text-center">
                      <p className="text-xs text-white/40 mb-1">You Received</p>
                      <div className="flex items-center gap-2">
                        <TokenIcon token={trade.makerToken} size="sm" />
                        <span className="font-bold text-white">
                          {formatTokenAmount(trade.makerAmount, trade.makerToken.decimals)} {trade.makerToken.symbol}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm mb-6">
                  <Shield className="w-4 h-4" />
                  <span>Zero-knowledge verified • Wallets unlinkable</span>
                </div>

                <motion.button
                  onClick={handleReset}
                  className="btn-secondary"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Done
                </motion.button>
              </motion.div>
            )}

            {/* Decrypted Trade View */}
            {(status === 'decrypted' || status === 'confirming') && trade && (
              <motion.div
                key="decrypted"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <div className="text-center mb-6">
                  <motion.div
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-light border border-emerald-500/30 mb-4"
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                  >
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-emerald-300">Decrypted Successfully</span>
                  </motion.div>

                  <h3 className="text-2xl font-bold text-white mb-2">
                    Trade Invitation
                  </h3>
                  <p className="text-white/50 text-sm">
                    Review the trade details below
                  </p>
                </div>

                {/* Trade Details Card */}
                <div className="p-5 rounded-xl glass-light border border-white/5 mb-6">
                  {/* From (Maker) */}
                  <div className="text-center mb-4">
                    <p className="text-xs text-white/40 mb-2">From</p>
                    <p className="font-mono text-sm text-white/70">
                      {shortenAddress(trade.makerAddress)}
                    </p>
                  </div>

                  {/* Trade Flow */}
                  <div className="flex items-stretch gap-4 mb-4">
                    {/* What you receive */}
                    <div className="flex-1 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-xs text-emerald-400 mb-2">You Receive</p>
                      <div className="flex items-center gap-3">
                        <TokenIcon token={trade.makerToken} />
                        <div>
                          <p className="text-xl font-bold text-white">
                            {formatTokenAmount(trade.makerAmount, trade.makerToken.decimals)}
                          </p>
                          <p className="text-sm text-white/50">{trade.makerToken.symbol}</p>
                        </div>
                      </div>
                    </div>

                    {/* Arrow */}
                    <div className="flex items-center">
                      <motion.div
                        animate={{ x: [0, 3, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        className="p-2 rounded-full glass"
                      >
                        <ArrowRight className="w-5 h-5 text-white/50 rotate-180" />
                      </motion.div>
                    </div>

                    {/* What you send */}
                    <div className="flex-1 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                      <p className="text-xs text-red-400 mb-2">You Send</p>
                      <div className="flex items-center gap-3">
                        <TokenIcon token={trade.takerToken} />
                        <div>
                          <p className="text-xl font-bold text-white">
                            {formatTokenAmount(trade.takerAmount, trade.takerToken.decimals)}
                          </p>
                          <p className="text-sm text-white/50">{trade.takerToken.symbol}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expiration */}
                  <div className="flex items-center justify-between text-sm pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-white/50">
                      <Clock className="w-4 h-4" />
                      <span>Expires: {getTimeRemaining(trade.expiresAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-white/60">
                      <Shield className="w-4 h-4" />
                      <span>Atomic Swap</span>
                    </div>
                  </div>
                </div>

                {/* Balance Check */}
                {isConnected && trade && (
                  <div className="p-3 rounded-xl glass-light border border-white/5 mb-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Your {trade.takerToken.symbol} Balance</span>
                      <span className="font-mono text-white">
                        {formatTokenAmount(balances[trade.takerToken.id] || '0', trade.takerToken.decimals)} {trade.takerToken.symbol}
                      </span>
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-2"
                  >
                    <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}

                {/* Action Buttons */}
                {!isConnected ? (
                  <div className="wallet-adapter-wrapper w-full [&>button]:!w-full [&>button]:!justify-center [&>button]:!py-4 [&>button]:!bg-white [&>button]:!text-black [&>button]:!font-bold [&>button]:!rounded-xl [&>button]:hover:!bg-white/90">
                    <WalletMultiButton className="!w-full !flex !gap-2 !items-center" />
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <motion.button
                      onClick={handleReset}
                      className="flex-1 btn-secondary py-4"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Cancel
                    </motion.button>
                    
                    <motion.button
                      onClick={handleAcceptTrade}
                      disabled={status === 'confirming'}
                      className="flex-[2] btn-primary py-4 flex items-center justify-center gap-2"
                      whileHover={{ scale: status !== 'confirming' ? 1.02 : 1 }}
                      whileTap={{ scale: status !== 'confirming' ? 0.98 : 1 }}
                    >
                      {status === 'confirming' ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Confirming...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5" />
                          <span>Accept & Execute Swap</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                )}
              </motion.div>
            )}

            {/* Loading State */}
            {status === 'loading' && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="inline-flex items-center justify-center w-16 h-16 rounded-full glass border border-white/10 mb-6"
                >
                  <Lock className="w-8 h-8 text-white/60" />
                </motion.div>
                
                <h3 className="text-xl font-bold text-white mb-2">
                  Decrypting Trade Data...
                </h3>
                <p className="text-white/50 text-sm">
                  Verifying zero-knowledge proof
                </p>
              </motion.div>
            )}

            {/* Input Form (Idle State) */}
            {(status === 'idle' || status === 'error') && !trade && (
              <motion.div
                key="input"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <div className="text-center mb-6">
                  <motion.div
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-light border border-white/10 mb-4"
                    animate={{ y: [0, -2, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Link2 className="w-4 h-4 text-white/60" />
                    <span className="text-sm text-white/60">Claim Trade</span>
                  </motion.div>
                  
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Claim Your Tokens
                  </h2>
                  <p className="text-white/50 text-sm">
                    Paste the GhostSwap link you received
                  </p>
                </div>

                <form onSubmit={handleSubmitLink}>
                  <div className="mb-4">
                    <label className="block text-sm text-white/50 mb-2">
                      Trade Link
                    </label>
                    <textarea
                      value={inputLink}
                      onChange={(e) => setInputLink(e.target.value)}
                      placeholder="Paste your ghostswap.io/claim/... link here"
                      className="w-full px-4 py-4 rounded-xl glass-light border border-white/5 text-white placeholder-white/30 outline-none transition-all focus:border-white/10 resize-none min-h-[100px] font-mono text-sm"
                    />
                  </div>

                  {/* Error Display */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-2"
                    >
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </motion.div>
                  )}

                  <motion.button
                    type="submit"
                    disabled={!inputLink.trim()}
                    className="w-full btn-primary py-4 flex items-center justify-center gap-2"
                    whileHover={{ scale: inputLink.trim() ? 1.02 : 1 }}
                    whileTap={{ scale: inputLink.trim() ? 0.98 : 1 }}
                  >
                    <Lock className="w-5 h-5" />
                    <span>Decrypt & View Trade</span>
                  </motion.button>
                </form>

                {/* Info */}
                <div className="mt-6 p-4 rounded-xl glass-light border border-white/5">
                  <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-white/60" />
                    How it works
                  </h4>
                  <ul className="text-xs text-white/40 space-y-1">
                    <li>• The link contains encrypted trade details</li>
                    <li>• Only your wallet can decrypt and view the terms</li>
                    <li>• If you accept, an atomic swap is executed</li>
                    <li>• Both parties' wallets remain private</li>
                  </ul>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
      </motion.div>
    </div>
  );
}
