'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { TradeOrder, TOKENS, useAppStore, formatTokenAmount, parseTokenAmount } from '@/utils/store';
import { extractLinkData, decodeTradeLink, validateTradeOrder, shortenAddress, getTimeRemaining } from '@/utils/crypto';
import { useAleoTrade } from '@/hooks/useAleoTrade';
import { PROGRAM_ID } from '@/utils/aleo';
import { TokenIcon } from './TokenSelector';
import {
  ArrowRight,
  Clock,
  Shield,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Lock,
  Link2,
  Loader2,
  XCircle,
  Copy,
  Check,
  Ticket,
  RefreshCw,
} from 'lucide-react';

interface ClaimTradeProps {
  linkData?: string;
}

// Steps:
//   idle        → paste link form
//   loading     → decoding link
//   awaiting    → decoded, waiting for ticket / not connected
//   ticket-check → checking records for ClaimTicket
//   ready       → ClaimTicket found, ready to swap
//   confirming  → transaction in flight
//   success     → swap complete
//   error       → something went wrong

type Step = 'idle' | 'loading' | 'awaiting' | 'ticket-check' | 'ready' | 'confirming' | 'success' | 'error';

export function ClaimTrade({ linkData }: ClaimTradeProps) {
  const { connected: isConnected, address } = useWallet();
  const { connected: walletConnected, requestRecords } = useWallet() as any;
  const { balances } = useAppStore();
  const { executeTrade, isProcessing } = useAleoTrade();

  const [inputLink, setInputLink] = useState('');
  const [trade, setTrade] = useState<TradeOrder | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [claimTicket, setClaimTicket] = useState<unknown>(null);

  // Auto-decode if linkData is provided via props (direct URL)
  useEffect(() => {
    if (linkData) handleDecryptLink(linkData);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkData]);

  // ---- Step 1: Decode link ------------------------------------------------
  const handleDecryptLink = async (data: string) => {
    setStep('loading');
    setError(null);
    await new Promise((r) => setTimeout(r, 500));
    try {
      const decoded = decodeTradeLink(data, TOKENS);
      if (!decoded) throw new Error('Invalid or corrupted link. Ask the sender to generate a new one.');
      const v = validateTradeOrder(decoded);
      if (!v.valid) throw new Error(v.error);
      setTrade(decoded);
      setStep('awaiting');
    } catch (e: any) {
      setError(e.message || 'Failed to decode link');
      setStep('error');
    }
  };

  const handleSubmitLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputLink.trim()) return;
    const data = extractLinkData(inputLink.trim());
    if (data) handleDecryptLink(data);
    else { setError('Invalid link format'); setStep('error'); }
  };

  // ---- Step 2: Copy address -----------------------------------------------
  const handleCopyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ---- Step 3: Check for ClaimTicket -------------------------------------
  const handleCheckTicket = useCallback(async () => {
    if (!trade || !requestRecords) return;
    setStep('ticket-check');
    setError(null);
    try {
      // includePlaintext=true so we get the record plaintext for execute_swap
      const records: any[] = await requestRecords(PROGRAM_ID, true);
      const norm = (s: string) => (s ?? '').replace(/field$/, '').trim();
      const recOid = (r: any): string => r?.data?.order_id ?? r?.order_id ?? '';
      const recTypeName = (r: any): string =>
        (r?.record_name ?? r?.type ?? r?.name ?? '').toLowerCase();
      const ticket = records?.find((r: any) =>
        norm(recOid(r)) === norm(trade.orderId) && recTypeName(r) === 'claimticket'
      ) ?? null;
      if (ticket) {
        setClaimTicket(ticket);
        setStep('ready');
      } else {
        setError(
          'Ticket not found yet. Make sure Alice clicked "Issue Ticket" and the transaction confirmed, then try again.'
        );
        setStep('awaiting');
      }
    } catch (e: any) {
      setError(e.message || 'Failed to check records');
      setStep('awaiting');
    }
  }, [trade, requestRecords]);

  // ---- Step 4: Execute swap -----------------------------------------------
  const handleExecuteSwap = async () => {
    if (!trade || !isConnected) return;
    setStep('confirming');
    setError(null);
    try {
      const takerAmountBase = parseTokenAmount(
        formatTokenAmount(trade.takerAmount, trade.takerToken.decimals),
        trade.takerToken.decimals
      );
      await executeTrade(trade, trade.takerToken, takerAmountBase);
      setStep('success');
    } catch (e: any) {
      setError(e.message || 'Swap failed');
      setStep('ready');
    }
  };

  const handleReset = () => {
    setInputLink('');
    setTrade(null);
    setStep('idle');
    setError(null);
    setClaimTicket(null);
  };

  // =========================================================================
  return (
    <div className="relative">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card glow"
      >
        <AnimatePresence mode="wait">

          {/* ── SUCCESS ──────────────────────────────────────────────── */}
          {step === 'success' && trade && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="text-center py-6">
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 mb-6"
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-2">Swap Complete! 🎉</h3>
              <p className="text-white/50 mb-6">Your tokens have been privately swapped</p>
              <div className="p-4 rounded-xl glass-light border border-emerald-500/20 mb-6">
                <div className="flex items-center justify-center gap-4">
                  <div className="text-center">
                    <p className="text-xs text-white/40 mb-1">You Sent</p>
                    <div className="flex items-center gap-2">
                      <TokenIcon token={trade.takerToken} size="sm" />
                      <span className="font-bold text-white">{formatTokenAmount(trade.takerAmount, trade.takerToken.decimals)} {trade.takerToken.symbol}</span>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-emerald-400" />
                  <div className="text-center">
                    <p className="text-xs text-white/40 mb-1">You Received</p>
                    <div className="flex items-center gap-2">
                      <TokenIcon token={trade.makerToken} size="sm" />
                      <span className="font-bold text-white">{formatTokenAmount(trade.makerAmount, trade.makerToken.decimals)} {trade.makerToken.symbol}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm mb-6">
                <Shield className="w-4 h-4" />
                <span>Zero-knowledge verified — wallets remain unlinkable</span>
              </div>
              <button onClick={handleReset} className="btn-secondary" >Done</button>
            </motion.div>
          )}

          {/* ── READY TO SWAP ─────────────────────────────────────────── */}
          {(step === 'ready' || step === 'confirming') && trade && (
            <motion.div key="ready" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-5">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-light border border-emerald-500/30 mb-3">
                  <Ticket className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-300">Ticket Ready</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">Execute Swap</h3>
                <p className="text-white/50 text-sm">Your claim ticket has been verified. Review the terms below.</p>
              </div>
              <TradeDetailsCard trade={trade} balances={balances} />
              {error && <ErrorBox msg={error} />}
              {!isConnected ? (
                <div className="wallet-adapter-wrapper w-full mt-4 [&>button]:!w-full [&>button]:!justify-center [&>button]:!py-4 [&>button]:!bg-white [&>button]:!text-black [&>button]:!font-bold [&>button]:!rounded-xl">
                  <WalletMultiButton />
                </div>
              ) : (
                <div className="flex gap-3 mt-4">
                  <button onClick={handleReset} className="flex-1 btn-secondary py-4">Cancel</button>
                  <motion.button
                    onClick={handleExecuteSwap}
                    disabled={step === 'confirming'}
                    className="flex-[2] btn-primary py-4 flex items-center justify-center gap-2"
                    whileHover={{ scale: step !== 'confirming' ? 1.02 : 1 }}
                    whileTap={{ scale: step !== 'confirming' ? 0.98 : 1 }}
                  >
                    {step === 'confirming'
                      ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Confirming in Wallet…</span></>
                      : <><Sparkles className="w-5 h-5" /><span>Execute Swap</span></>}
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── AWAITING TICKET ───────────────────────────────────────── */}
          {(step === 'awaiting' || step === 'ticket-check') && trade && (
            <motion.div key="awaiting" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-5">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-light border border-white/10 mb-3">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm text-emerald-300">Trade Decoded</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">Trade Invitation</h3>
                <p className="text-white/50 text-sm">Review the terms, then request your claim ticket from Alice</p>
              </div>

              <TradeDetailsCard trade={trade} balances={balances} />

              {/* Address share panel */}
              {isConnected && address && (
                <div className="mt-4 p-4 rounded-xl glass-light border border-white/10">
                  <p className="text-xs text-white/50 mb-2 font-medium">
                    📋 Step 1 — Share your address with the trade creator
                  </p>
                  <p className="text-xs text-white/40 mb-3">
                    The trade creator must call <span className="font-mono text-white/60">generate_ticket</span> with your address before you can execute.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono text-white/70 bg-white/5 px-3 py-2 rounded-lg truncate">
                      {address}
                    </code>
                    <button
                      onClick={handleCopyAddress}
                      className="flex-shrink-0 p-2 rounded-lg glass border border-white/5 hover:border-white/10 text-white/50 hover:text-white transition-all"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Check ticket button */}
              <div className="mt-4 p-4 rounded-xl glass-light border border-white/10">
                <p className="text-xs text-white/50 mb-3 font-medium">
                  📬 Step 2 — After Alice issues your ticket, check your wallet
                </p>
                {error && <ErrorBox msg={error} />}
                {!isConnected ? (
                  <div className="wallet-adapter-wrapper [&>button]:!w-full [&>button]:!justify-center [&>button]:!py-3 [&>button]:!bg-white [&>button]:!text-black [&>button]:!font-bold [&>button]:!rounded-xl">
                    <WalletMultiButton />
                  </div>
                ) : (
                  <button
                    onClick={handleCheckTicket}
                    disabled={step === 'ticket-check'}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl glass border border-white/10 text-white/70 hover:text-white hover:border-white/20 transition-all"
                  >
                    {step === 'ticket-check'
                      ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Checking wallet records…</span></>
                      : <><RefreshCw className="w-4 h-4" /><span>Check for My Ticket</span></>}
                  </button>
                )}
              </div>

              <button onClick={handleReset} className="w-full mt-3 text-xs text-white/30 hover:text-white/50 transition-colors">← Use a different link</button>
            </motion.div>
          )}

          {/* ── LOADING ───────────────────────────────────────────────── */}
          {step === 'loading' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-12">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="inline-flex items-center justify-center w-16 h-16 rounded-full glass border border-white/10 mb-6"
              >
                <Lock className="w-8 h-8 text-white/60" />
              </motion.div>
              <h3 className="text-xl font-bold text-white mb-2">Decoding Trade Link…</h3>
              <p className="text-white/50 text-sm">Reading encrypted trade data</p>
            </motion.div>
          )}

          {/* ── IDLE / ERROR ──────────────────────────────────────────── */}
          {(step === 'idle' || step === 'error') && !trade && (
            <motion.div key="idle" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-light border border-white/10 mb-4">
                  <Link2 className="w-4 h-4 text-white/60" />
                  <span className="text-sm text-white/60">Claim Trade</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Claim Your Tokens</h2>
                <p className="text-white/50 text-sm">Paste the GhostSwap link you received</p>
              </div>

              <form onSubmit={handleSubmitLink}>
                <div className="mb-4">
                  <label className="block text-sm text-white/50 mb-2">Trade Link</label>
                  <textarea
                    value={inputLink}
                    onChange={(e) => setInputLink(e.target.value)}
                    placeholder="Paste your ghost-swap.vercel.app/claim/... link here"
                    className="w-full px-4 py-4 rounded-xl glass-light border border-white/5 text-white placeholder-white/30 outline-none focus:border-white/10 resize-none min-h-[100px] font-mono text-sm"
                  />
                </div>
                {step === 'error' && error && <ErrorBox msg={error} />}
                <motion.button
                  type="submit"
                  disabled={!inputLink.trim()}
                  className="w-full btn-primary py-4 flex items-center justify-center gap-2"
                  whileHover={{ scale: inputLink.trim() ? 1.02 : 1 }}
                >
                  <Lock className="w-5 h-5" />
                  <span>Decode & View Trade</span>
                </motion.button>
              </form>

              <div className="mt-6 p-4 rounded-xl glass-light border border-white/5">
                <h4 className="text-sm font-medium text-white mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-white/60" /> How it works
                </h4>
                <ol className="text-xs text-white/40 space-y-1 list-decimal list-inside">
                  <li>Paste the link you received from your trading partner</li>
                  <li>Review the trade terms (what you send/receive)</li>
                  <li>Share your wallet address with the sender</li>
                  <li>They issue a ClaimTicket to your address on-chain</li>
                  <li>Click &quot;Check for My Ticket&quot; once they confirm</li>
                  <li>Execute the atomic swap — both sides settle privately</li>
                </ol>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────
function TradeDetailsCard({ trade, balances }: { trade: TradeOrder; balances: Record<string, string> }) {
  return (
    <div className="p-5 rounded-xl glass-light border border-white/5 mb-2">
      <div className="text-center mb-3">
        <p className="text-xs text-white/40 mb-1">From</p>
        <p className="font-mono text-sm text-white/70">{shortenAddress(trade.makerAddress)}</p>
      </div>
      <div className="flex items-stretch gap-3 mb-4">
        <div className="flex-1 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-xs text-emerald-400 mb-2">You Receive</p>
          <div className="flex items-center gap-2">
            <TokenIcon token={trade.makerToken} />
            <div>
              <p className="text-xl font-bold text-white">{formatTokenAmount(trade.makerAmount, trade.makerToken.decimals)}</p>
              <p className="text-sm text-white/50">{trade.makerToken.symbol}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center">
          <motion.div animate={{ x: [0, 3, 0] }} transition={{ duration: 1.5, repeat: Infinity }} className="p-2 rounded-full glass">
            <ArrowRight className="w-5 h-5 text-white/50 rotate-180" />
          </motion.div>
        </div>
        <div className="flex-1 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400 mb-2">You Send</p>
          <div className="flex items-center gap-2">
            <TokenIcon token={trade.takerToken} />
            <div>
              <p className="text-xl font-bold text-white">{formatTokenAmount(trade.takerAmount, trade.takerToken.decimals)}</p>
              <p className="text-sm text-white/50">{trade.takerToken.symbol}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm pt-3 border-t border-white/5">
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
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-2">
      <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <span>{msg}</span>
    </div>
  );
}
