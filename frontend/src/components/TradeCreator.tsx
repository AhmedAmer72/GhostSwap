'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { Token, TOKENS, useAppStore, parseTokenAmount, formatTokenAmount } from '@/utils/store';
import { validateTradeOrder } from '@/utils/crypto';
import { useAleoTrade } from '@/hooks/useAleoTrade';
import { TokenSelector, TokenAmountInput } from './TokenSelector';
import { ShareableLink } from './ShareableLink';
import { 
  ArrowDownUp, 
  Zap, 
  Shield, 
  Clock, 
  Sparkles,
  Ghost,
  Lock,
  AlertCircle,
  ChevronDown
} from 'lucide-react';

export function TradeCreator() {
  const { connected: isConnected, address } = useWallet();
  const { balances } = useAppStore();
  const { createTrade, isProcessing } = useAleoTrade();
  const isLoading = isProcessing;

  // Form state
  const [offerToken, setOfferToken] = useState<Token | null>(null);
  const [offerAmount, setOfferAmount] = useState('');
  const [requestToken, setRequestToken] = useState<Token | null>(null);
  const [requestAmount, setRequestAmount] = useState('');
  const [expiresIn, setExpiresIn] = useState(24); // hours
  const [step, setStep] = useState<'form' | 'confirm' | 'generated'>('form');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Swap tokens
  const handleSwapTokens = () => {
    const tempToken = offerToken;
    const tempAmount = offerAmount;
    setOfferToken(requestToken);
    setOfferAmount(requestAmount);
    setRequestToken(tempToken);
    setRequestAmount(tempAmount);
  };

  // Validate form
  const isFormValid = () => {
    if (!offerToken || !requestToken) return false;
    if (!offerAmount || parseFloat(offerAmount) <= 0) return false;
    if (!requestAmount || parseFloat(requestAmount) <= 0) return false;
    if (offerToken.id === requestToken.id) return false;
    return true;
  };

  // Create trade
  const handleCreateTrade = async () => {
    if (!isFormValid() || !address || !offerToken || !requestToken) return;

    setError(null);

    try {
      // Convert to base units
      const makerAmountBase = parseTokenAmount(offerAmount, offerToken.decimals);
      const takerAmountBase = parseTokenAmount(requestAmount, requestToken.decimals);

      // createTrade calls create_order on-chain and returns the shareable URL
      const shareUrl = await createTrade(
        offerToken,
        makerAmountBase,
        requestToken,
        takerAmountBase,
        expiresIn
      );

      setGeneratedLink(shareUrl);
      setStep('generated');
    } catch (err: any) {
      console.error('Failed to create trade:', err);
      setError(err.message || 'Failed to create trade');
    }
  };

  // Reset form
  const handleReset = () => {
    setOfferToken(null);
    setOfferAmount('');
    setRequestToken(null);
    setRequestAmount('');
    setExpiresIn(24);
    setStep('form');
    setGeneratedLink(null);
    setError(null);
  };

  // Calculate exchange rate
  const getExchangeRate = () => {
    if (!offerAmount || !requestAmount || parseFloat(offerAmount) === 0) return null;
    return (parseFloat(requestAmount) / parseFloat(offerAmount)).toFixed(6);
  };

  return (
    <div className="relative">
      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card glow"
      >
        <AnimatePresence mode="wait">
          {step === 'generated' && generatedLink ? (
            <motion.div
              key="generated"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <ShareableLink
                  url={generatedLink}
                  offerToken={offerToken!}
                  offerAmount={offerAmount}
                  requestToken={requestToken!}
                  requestAmount={requestAmount}
                  expiresIn={expiresIn}
                  onCreateNew={handleReset}
                />
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                {/* Header */}
                <div className="text-center mb-6">
                  <motion.div
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-light border border-white/10 mb-4"
                    animate={{ y: [0, -2, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Ghost className="w-4 h-4 text-white/60" />
                    <span className="text-sm text-white/60">Private OTC Trade</span>
                  </motion.div>
                  
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Create Ghost Trade
                  </h2>
                  <p className="text-white/50 text-sm">
                    Generate a shareable link for trustless, private token swaps
                  </p>
                </div>

                {/* Not connected warning */}
                {!isConnected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-yellow-300 font-medium">Wallet not connected</p>
                      <p className="text-yellow-400/70 text-sm mt-1">
                        Connect your Shield Wallet to create trades
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Offer Section */}
                <div className="space-y-4 mb-4">
                  <TokenSelector
                    selectedToken={offerToken}
                    onSelect={setOfferToken}
                    excludeToken={requestToken}
                    label="You Offer"
                  />
                  
                  <TokenAmountInput
                    value={offerAmount}
                    onChange={setOfferAmount}
                    token={offerToken}
                    balance={offerToken ? balances[offerToken.id] : undefined}
                    label="Amount to Offer"
                  />
                </div>

                {/* Swap Button */}
                <div className="flex justify-center -my-2 relative z-10">
                  <motion.button
                    onClick={handleSwapTokens}
                    className="p-3 rounded-xl glass border border-white/10 text-white/60 hover:text-white hover:border-white/20 transition-all shadow-glass"
                    whileHover={{ scale: 1.1, rotate: 180 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ArrowDownUp className="w-5 h-5" />
                  </motion.button>
                </div>

                {/* Request Section */}
                <div className="space-y-4 mt-4">
                  <TokenSelector
                    selectedToken={requestToken}
                    onSelect={setRequestToken}
                    excludeToken={offerToken}
                    label="You Request"
                  />
                  
                  <TokenAmountInput
                    value={requestAmount}
                    onChange={setRequestAmount}
                    token={requestToken}
                    label="Amount to Request"
                  />
                </div>

                {/* Exchange Rate Display */}
                {getExchangeRate() && offerToken && requestToken && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 p-3 rounded-xl glass-light border border-white/5"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/50">Exchange Rate</span>
                      <span className="text-white font-mono">
                        1 {offerToken.symbol} = {getExchangeRate()} {requestToken.symbol}
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Expiration Selector */}
                <div className="mt-4">
                  <label className="block text-sm text-white/50 mb-2">
                    <Clock className="w-4 h-4 inline mr-2" />
                    Link Expires In
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 6, 24, 72].map((hours) => (
                      <button
                        key={hours}
                        onClick={() => setExpiresIn(hours)}
                        className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                          expiresIn === hours
                            ? 'bg-white text-black'
                            : 'glass-light border border-white/5 text-white/50 hover:text-white hover:border-white/10'
                        }`}
                      >
                        {hours}h
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm"
                  >
                    {error}
                  </motion.div>
                )}

                {/* Create Button */}
                <motion.button
                  onClick={handleCreateTrade}
                  disabled={!isFormValid() || !isConnected || isLoading}
                  className="w-full mt-6 btn-primary py-4 text-lg flex items-center justify-center gap-3"
                  whileHover={{ scale: isFormValid() && isConnected ? 1.02 : 1 }}
                  whileTap={{ scale: isFormValid() && isConnected ? 0.98 : 1 }}
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Generate Ghost Link</span>
                    </>
                  )}
                </motion.button>

                {/* Features */}
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <FeatureBadge icon={<Shield className="w-4 h-4" />} text="MEV Protected" />
                  <FeatureBadge icon={<Lock className="w-4 h-4" />} text="Zero-Knowledge" />
                  <FeatureBadge icon={<Zap className="w-4 h-4" />} text="Atomic Swap" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
      </motion.div>
    </div>
  );
}

function FeatureBadge({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg glass-light border border-white/5">
      <span className="text-white/50">{icon}</span>
      <span className="text-xs text-white/50">{text}</span>
    </div>
  );
}
