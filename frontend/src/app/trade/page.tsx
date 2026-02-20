'use client';

import React from 'react';
import { Header } from '@/components/Header';
import { TradeCreator } from '@/components/TradeCreator';
import { TokenBalances } from '@/components/TokenBalances';
import { TradeHistory } from '@/components/TradeHistory';
import { motion } from 'framer-motion';

export default function TradePage() {
  return (
    <main className="min-h-screen bg-black bg-noise">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-radial-gradient pointer-events-none" />
      
      <Header />
      
      <div className="relative z-10 pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Create a Ghost Trade
            </h1>
            <p className="text-white/50 max-w-lg mx-auto">
              Set your terms and generate a private link to share with your trading partner.
            </p>
          </motion.div>

          {/* Main Grid Layout */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Trade Creator - Main Column */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-2"
            >
              <TradeCreator />
            </motion.div>

            {/* Sidebar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              {/* Token Balances */}
              <TokenBalances />
              
              {/* Trade History */}
              <TradeHistory />
            </motion.div>
          </div>
        </div>
      </div>
    </main>
  );
}
