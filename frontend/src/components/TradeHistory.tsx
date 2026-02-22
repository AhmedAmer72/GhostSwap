'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore, formatTokenAmount, TradeOrder } from '@/utils/store';
import { shortenAddress, getTimeRemaining, createShareableUrl } from '@/utils/crypto';
import { useAleoTrade } from '@/hooks/useAleoTrade';
import { TokenIcon } from './TokenSelector';
import {
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  History,
  Ghost,
  Copy,
  Check,
  Ticket,
  Ban,
  Loader2,
  X,
  ExternalLink,
} from 'lucide-react';

export function TradeHistory() {
  const { myOrders } = useAppStore();
  const { cancelTrade, generateTicket, isProcessing } = useAleoTrade();

  const [copied, setCopied] = useState<string | null>(null);
  const [ticketModal, setTicketModal] = useState<TradeOrder | null>(null);
  const [takerAddress, setTakerAddress] = useState('');
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [ticketSuccess, setTicketSuccess] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const handleCopyLink = async (order: TradeOrder) => {
    const url = createShareableUrl(order);
    await navigator.clipboard.writeText(url);
    setCopied(order.orderId);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleCancel = async (order: TradeOrder) => {
    setCancelling(order.orderId);
    try {
      await cancelTrade(order);
    } catch (e: any) {
      alert(e.message || 'Cancel failed');
    } finally {
      setCancelling(null);
    }
  };

  const handleIssueTicket = async () => {
    if (!ticketModal || !takerAddress.trim()) return;
    setTicketError(null);
    setTicketSuccess(false);
    if (!takerAddress.startsWith('aleo1') || takerAddress.length < 60) {
      setTicketError('Invalid Aleo address. Must start with aleo1 and be 63 characters.');
      return;
    }
    try {
      await generateTicket(ticketModal, takerAddress.trim());
      setTicketSuccess(true);
      setTimeout(() => {
        setTicketModal(null);
        setTakerAddress('');
        setTicketSuccess(false);
      }, 2000);
    } catch (e: any) {
      setTicketError(e.message || 'Failed to issue ticket');
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'fulfilled': return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-400" />;
      case 'expired':   return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      default:           return <Clock className="w-4 h-4 text-white/50" />;
    }
  };

  const statusBorder = (status: string) => {
    switch (status) {
      case 'fulfilled': return 'border-emerald-500/30 bg-emerald-500/5';
      case 'cancelled': return 'border-red-500/30 bg-red-500/5';
      case 'expired':   return 'border-yellow-500/30 bg-yellow-500/5';
      default:           return 'border-white/10 bg-white/5';
    }
  };

  return (
    <>
      <div className="glass-card">
        <div className="flex items-center gap-2 mb-5">
          <History className="w-5 h-5 text-white/60" />
          <h3 className="font-semibold text-white">Trade History</h3>
          {myOrders.length > 0 && (
            <span className="ml-auto text-xs text-white/40">{myOrders.length} order{myOrders.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {myOrders.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full glass-light mb-4">
              <Ghost className="w-8 h-8 text-white/30" />
            </div>
            <p className="text-white/50 text-sm mb-3">No trades yet</p>
            <a href="/trade" className="inline-flex items-center gap-2 text-white text-sm hover:underline">
              Create Trade <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        ) : (
          <div className="space-y-3">
            {myOrders.map((order, i) => (
              <motion.div
                key={order.orderId}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`rounded-xl p-4 border ${statusBorder(order.status)}`}
              >
                {/* Top row: status + order id + expiry */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    {statusIcon(order.status)}
                    <span className="text-xs font-medium text-white capitalize">{order.status}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/30">
                    {order.status === 'pending' && (
                      <span className="text-white/50">⏱ {getTimeRemaining(order.expiresAt)}</span>
                    )}
                    <span className="font-mono">{shortenAddress(order.orderId)}</span>
                  </div>
                </div>

                {/* Token flow */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <TokenIcon token={order.makerToken} size="sm" />
                    <span className="text-sm font-semibold text-white">
                      {formatTokenAmount(order.makerAmount, order.makerToken.decimals)} {order.makerToken.symbol}
                    </span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-white/30 flex-shrink-0" />
                  <div className="flex items-center gap-1.5">
                    <TokenIcon token={order.takerToken} size="sm" />
                    <span className="text-sm font-semibold text-white">
                      {formatTokenAmount(order.takerAmount, order.takerToken.decimals)} {order.takerToken.symbol}
                    </span>
                  </div>
                </div>

                {/* Actions for pending orders */}
                {order.status === 'pending' && (
                  <div className="flex items-center gap-2 mt-1 pt-3 border-t border-white/5">
                    {/* Copy link */}
                    <button
                      onClick={() => handleCopyLink(order)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-light border border-white/5 text-xs text-white/60 hover:text-white hover:border-white/10 transition-all"
                      title="Copy shareable link"
                    >
                      {copied === order.orderId
                        ? <><Check className="w-3.5 h-3.5 text-emerald-400" /><span>Copied!</span></>
                        : <><Copy className="w-3.5 h-3.5" /><span>Copy Link</span></>}
                    </button>

                    {/* Issue ticket for taker */}
                    <button
                      onClick={() => { setTicketModal(order); setTakerAddress(''); setTicketError(null); setTicketSuccess(false); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-light border border-white/5 text-xs text-white/60 hover:text-white hover:border-white/10 transition-all"
                      title="Issue a ClaimTicket to your trading partner"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>Issue Ticket</span>
                    </button>

                    {/* Cancel */}
                    <button
                      onClick={() => handleCancel(order)}
                      disabled={cancelling === order.orderId}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg glass-light border border-red-500/20 text-xs text-red-400/70 hover:text-red-300 hover:border-red-500/40 transition-all"
                      title="Cancel order and reclaim tokens"
                    >
                      {cancelling === order.orderId
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Ban className="w-3.5 h-3.5" />}
                      <span>{cancelling === order.orderId ? 'Cancelling…' : 'Cancel'}</span>
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Issue Ticket Modal */}
      <AnimatePresence>
        {ticketModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setTicketModal(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Issue Claim Ticket</h3>
                  <p className="text-xs text-white/40 mt-0.5">
                    Your trading partner needs this ticket to execute the swap
                  </p>
                </div>
                <button onClick={() => setTicketModal(null)} className="text-white/40 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Order summary */}
              {ticketModal && (
                <div className="p-3 rounded-xl glass-light border border-white/5 mb-4 text-sm">
                  <div className="flex items-center gap-2">
                    <TokenIcon token={ticketModal.makerToken} size="sm" />
                    <span className="text-white">{formatTokenAmount(ticketModal.makerAmount, ticketModal.makerToken.decimals)} {ticketModal.makerToken.symbol}</span>
                    <ArrowRight className="w-4 h-4 text-white/30" />
                    <TokenIcon token={ticketModal.takerToken} size="sm" />
                    <span className="text-white">{formatTokenAmount(ticketModal.takerAmount, ticketModal.takerToken.decimals)} {ticketModal.takerToken.symbol}</span>
                  </div>
                </div>
              )}

              <div className="mb-1">
                <label className="block text-xs text-white/50 mb-1.5">
                  Trading partner's Aleo address
                </label>
                <input
                  type="text"
                  value={takerAddress}
                  onChange={(e) => setTakerAddress(e.target.value)}
                  placeholder="aleo1..."
                  className="w-full px-3 py-2.5 rounded-lg glass-light border border-white/5 text-white text-sm font-mono placeholder-white/20 outline-none focus:border-white/10"
                />
                <p className="text-xs text-white/30 mt-1.5">
                  Ask your partner to share their wallet address from the claim page.
                </p>
              </div>

              {ticketError && <p className="text-red-400 text-sm mt-3">{ticketError}</p>}
              {ticketSuccess && <p className="text-emerald-400 text-sm mt-3">✓ Ticket issued! Your partner can now execute the swap.</p>}

              <button
                onClick={handleIssueTicket}
                disabled={isProcessing || !takerAddress.trim() || ticketSuccess}
                className="w-full mt-4 btn-primary py-3 flex items-center justify-center gap-2"
              >
                {isProcessing
                  ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Issuing…</span></>
                  : <><Ticket className="w-4 h-4" /><span>Issue Ticket to Partner</span></>}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
