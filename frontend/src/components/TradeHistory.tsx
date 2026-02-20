'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore, formatTokenAmount } from '@/utils/store';
import { shortenAddress, getTimeRemaining } from '@/utils/crypto';
import { TokenIcon } from './TokenSelector';
import {
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  History,
  Ghost,
} from 'lucide-react';

export function TradeHistory() {
  const { myOrders } = useAppStore();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fulfilled':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'expired':
        return <AlertCircle className="w-5 h-5 text-yellow-400" />;
      default:
        return <Clock className="w-5 h-5 text-white/60" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fulfilled':
        return 'border-emerald-500/30 bg-emerald-500/5';
      case 'cancelled':
        return 'border-red-500/30 bg-red-500/5';
      case 'expired':
        return 'border-yellow-500/30 bg-yellow-500/5';
      default:
        return 'border-white/10 bg-white/5';
    }
  };

  return (
    <div className="glass-card">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-white/60" />
        <h3 className="font-semibold text-white">Trade History</h3>
      </div>

      {/* Orders List */}
      {myOrders.length === 0 ? (
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full glass-light mb-4">
            <Ghost className="w-8 h-8 text-white/30" />
          </div>
          <p className="text-white/50 text-sm mb-3">No trades yet</p>
          <a
            href="/trade"
            className="inline-flex items-center gap-2 text-white text-sm hover:underline"
          >
            Create Trade
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      ) : (
        <div className="space-y-3">
          {myOrders.slice(0, 3).map((order, index) => (
            <motion.div
              key={order.orderId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`glass-light rounded-xl p-3 border ${getStatusColor(order.status)}`}
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                {/* Status */}
                <div className="flex items-center gap-2">
                  {getStatusIcon(order.status)}
                  <span className="text-sm font-medium text-white capitalize">
                    {order.status}
                  </span>
                </div>
                {/* Order ID */}
                <span className="text-xs font-mono text-white/40">
                  {shortenAddress(order.orderId)}
                </span>
              </div>

              {/* Trade Details */}
              <div className="flex items-center gap-2 text-sm">
                <span className="text-white">
                  {formatTokenAmount(order.makerAmount, order.makerToken.decimals)} {order.makerToken.symbol}
                </span>
                <ArrowRight className="w-4 h-4 text-white/30" />
                <span className="text-white">
                  {formatTokenAmount(order.takerAmount, order.takerToken.decimals)} {order.takerToken.symbol}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
