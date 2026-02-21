'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { WalletButton } from '@/components/WalletButton';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-black bg-noise flex flex-col">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-radial-gradient pointer-events-none" />
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50">
        <div className="glass-dark border-b border-white/5">
          <div className="max-w-7xl mx-auto px-6 h-28 py-2 flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo.png" alt="GhostSwap" width={96} height={96} className="rounded-xl" />
              <span className="font-bold text-2xl text-white">GhostSwap</span>
            </Link>

            {/* Wallet Button */}
            <WalletButton />
          </div>
        </div>
      </nav>

      {/* Hero - Centered */}
      <section className="flex-1 flex items-center justify-center relative z-10">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Logo Icon */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="mb-8 flex justify-center"
            >
              <Image src="/logo.png" alt="GhostSwap" width={320} height={320} className="rounded-3xl shadow-2xl" />
            </motion.div>

            {/* App Name */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight text-white mb-6"
            >
              GhostSwap
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-xl md:text-2xl text-white/50 max-w-xl mx-auto mb-12"
            >
              Private P2P Token Trading on Aleo
            </motion.p>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="inline-flex items-center gap-2 glass-tag mb-12"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Zero-Knowledge • MEV Protected • Atomic Swaps</span>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link 
                href="/trade" 
                className="btn-primary px-10 py-4 text-lg flex items-center gap-3"
              >
                Create Trade
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                href="/claim" 
                className="btn-secondary px-10 py-4 text-lg"
              >
                Claim Link
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-6 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm text-white/30">
          <span>Built on Aleo</span>
          <span>© 2026 GhostSwap</span>
        </div>
      </footer>
    </main>
  );
}
