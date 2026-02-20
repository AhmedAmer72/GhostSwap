'use client';

import React from 'react';
import { Header, TradeHistory } from '@/components';
import { motion } from 'framer-motion';

export default function HistoryPage() {
  return (
    <main className="min-h-screen bg-black bg-noise">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-radial-gradient pointer-events-none" />
      
      <Header />

      <section className="relative z-10 pt-24 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Trade History
            </h1>
            <p className="text-white/50 max-w-lg mx-auto">
              View and manage all your private OTC trades.
            </p>
          </motion.div>
          
          <TradeHistory />
        </div>
      </section>
    </main>
  );
}
