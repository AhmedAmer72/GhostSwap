'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';
import { shortenAddress } from '@/utils/crypto';
import { LogOut, Copy, Check, ExternalLink, ChevronDown, Loader2 } from 'lucide-react';

const LAST_ADDRESS_KEY = 'ghostswap-last-address';

export function WalletButton() {
  const { address, disconnect, connected, connecting } = useWallet();
  const [showDropdown, setShowDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  // Cache the last known address in localStorage so the button never flashes
  // back to "Connect Wallet" while the adapter is re-establishing its session
  // after a page navigation.
  const [cachedAddress, setCachedAddress] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(LAST_ADDRESS_KEY);
  });

  useEffect(() => {
    if (connected && address) {
      localStorage.setItem(LAST_ADDRESS_KEY, address);
      setCachedAddress(address);
    }
    // Only wipe the cache when a real user-initiated disconnect occurs
    // (i.e. not connected AND not in the middle of reconnecting).
  }, [connected, address]);

  const handleCopy = async () => {
    const addr = address || cachedAddress;
    if (addr) {
      await navigator.clipboard.writeText(addr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      localStorage.removeItem(LAST_ADDRESS_KEY);
      setCachedAddress(null);
      setShowDropdown(false);
    } catch (e) {
      console.error('Disconnect failed:', e);
    }
  };

  // While adapter is spinning up (connecting) but we have a cached address,
  // show a lightweight "Reconnecting" pill instead of falling back to the
  // "Connect Wallet" button.
  if (!connected && connecting && cachedAddress) {
    return (
      <div className="glass flex items-center gap-3 px-4 py-2.5 rounded-xl border border-white/10">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0.5 bg-black rounded-full flex items-center justify-center">
            <span className="text-white/80 text-lg">👻</span>
          </div>
        </div>
        <div className="flex flex-col items-start">
          <span className="text-xs text-white/40">Reconnecting…</span>
          <span className="font-mono text-sm text-white/60">{shortenAddress(cachedAddress)}</span>
        </div>
        <Loader2 className="w-4 h-4 text-white/40 animate-spin" />
      </div>
    );
  }

  // Not connected and no previous session → plain connect button.
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
