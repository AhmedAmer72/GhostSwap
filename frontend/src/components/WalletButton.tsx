'use client';

/**
 * WalletButton — modelled after CloakStamp's TopNav wallet section.
 *
 * Three states (same logic as CloakStamp):
 *  1. Not connected          → WalletMultiButton (opens wallet-select modal)
 *  2. Connecting/reconnecting → ghost pill with spinner (no flash to state 1)
 *  3. Connected              → custom dropdown with address + actions
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { shortenAddress } from '@/utils/crypto';
import { LogOut, Copy, Check, ExternalLink, ChevronDown, Loader2 } from 'lucide-react';

const WALLET_NAME_KEY = 'ghostswap-wallet-name'; // set by SessionGuard when connected

export function WalletButton() {
  const { address, disconnect, connected, connecting } = useWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  // Read the cached address directly from localStorage (written by SessionGuard).
  // This is the single source of truth — no separate state to get out of sync.
  const hasCachedSession = typeof window !== 'undefined'
    && !!localStorage.getItem(WALLET_NAME_KEY);

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      // Wipe backup key so SessionGuard doesn't try to restore.
      localStorage.removeItem(WALLET_NAME_KEY);
      localStorage.removeItem('ghostswap-wallet');
      setShowDropdown(false);
    } catch (e) {
      console.error('Disconnect failed:', e);
    }
  };

  // State 2: adapter is (re)connecting and we know there's a saved session.
  // Show a ghost pill instead of reverting to "Connect Wallet".
  if (!connected && (connecting || hasCachedSession) && !address) {
    return (
      <div className="glass flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/10">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0.5 bg-black rounded-full flex items-center justify-center">
            <span className="text-white/80 text-lg">👻</span>
          </div>
        </div>
        <div className="flex flex-col items-start">
          <span className="text-xs text-white/40">Connecting…</span>
        </div>
        <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
      </div>
    );
  }

  // State 1: no connection, no saved session → open wallet modal.
  if (!connected || !address) {
    return (
      <div className="wallet-adapter-wrapper">
        <WalletMultiButton
          className="!bg-white !text-black !font-semibold !rounded-xl !py-2.5 !px-5 !h-auto !border-0 hover:!bg-white/90 !transition-all !shadow-lg hover:!shadow-xl !text-sm"
        />
      </div>
    );
  }

  // Connected - show custom dropdown
  return (
    <div className="relative">
      <motion.button
        onClick={() => setShowDropdown(!showDropdown)}
        className="glass flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 transition-all"
        whileHover={{ scale: 1.01 }}
      >
        {/* Avatar */}
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 bg-white/20 rounded-full animate-pulse" />
          <div className="absolute inset-0.5 bg-black rounded-full flex items-center justify-center">
            <span className="text-white/80 text-lg">👻</span>
          </div>
        </div>
        
        <div className="flex flex-col items-start">
          <span className="text-xs text-white/40">Connected</span>
          <span className="font-mono text-sm text-white">
            {shortenAddress(address || '')}
          </span>
        </div>
        
        <ChevronDown 
          className={`w-4 h-4 text-white/40 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
        />
      </motion.button>

      <AnimatePresence>
        {showDropdown && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setShowDropdown(false)} 
            />
            
            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-64 glass-dark rounded-xl border border-white/10 shadow-glass z-50 overflow-hidden"
            >
              {/* Address section */}
              <div className="p-4 border-b border-white/5">
                <p className="text-xs text-white/40 mb-1">Full Address</p>
                <p className="font-mono text-xs text-white/70 break-all">
                  {address}
                </p>
              </div>

              {/* Actions */}
              <div className="p-2">
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-white/40" />
                  )}
                  <span className="text-sm text-white/70">
                    {copied ? 'Copied!' : 'Copy Address'}
                  </span>
                </button>

                <a
                  href={`https://testnet.explorer.provable.com/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-white/40" />
                  <span className="text-sm text-white/70">View on Explorer</span>
                </a>

                <div className="my-2 border-t border-white/5" />

                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-900/20 transition-colors text-left"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-400">Disconnect</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
