'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Token, TOKENS, formatTokenAmount, getTokenById } from '@/utils/store';
import { ChevronDown, Search, X } from 'lucide-react';

interface TokenSelectorProps {
  selectedToken: Token | null;
  onSelect: (token: Token) => void;
  excludeToken?: Token | null;
  label: string;
}

export function TokenSelector({
  selectedToken,
  onSelect,
  excludeToken,
  label,
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredTokens = TOKENS.filter(
    (token) =>
      token.id !== excludeToken?.id &&
      (token.name.toLowerCase().includes(search.toLowerCase()) ||
        token.symbol.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="relative">
      <label className="block text-sm text-white/50 mb-2">{label}</label>
      
      <motion.button
        onClick={() => setIsOpen(true)}
        className="w-full flex items-center justify-between px-4 py-3 rounded-xl glass-light border border-white/5 hover:border-white/10 transition-all"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        {selectedToken ? (
          <div className="flex items-center gap-3">
            <TokenIcon token={selectedToken} />
            <div className="text-left">
              <p className="font-semibold text-white">{selectedToken.symbol}</p>
              <p className="text-xs text-white/40">{selectedToken.name}</p>
            </div>
          </div>
        ) : (
          <span className="text-white/40">Select token</span>
        )}
        
        <ChevronDown className="w-5 h-5 text-white/40" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md bg-zinc-900 rounded-2xl border border-white/10 shadow-2xl z-[101] flex flex-col max-h-[90vh] sm:max-h-[500px]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
                <h3 className="text-lg font-semibold text-white">Select Token</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white/60" />
                </button>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-white/10 flex-shrink-0">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search by name or symbol..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-white/40 outline-none focus:border-white/20"
                    autoFocus
                  />
                </div>
              </div>

              {/* Token List */}
              <div className="flex-1 overflow-y-auto p-2 min-h-0">
                {filteredTokens.length === 0 ? (
                  <p className="text-center text-white/40 py-8">No tokens found</p>
                ) : (
                  <div className="space-y-1">
                    {filteredTokens.map((token) => (
                      <motion.button
                        key={token.id}
                        onClick={() => {
                          onSelect(token);
                          setIsOpen(false);
                          setSearch('');
                        }}
                        className="w-full flex items-center gap-4 p-4 rounded-xl hover:bg-white/10 transition-colors"
                        whileHover={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <TokenIcon token={token} size="lg" />
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-white text-lg">{token.symbol}</p>
                          <p className="text-sm text-white/50">{token.name}</p>
                        </div>
                        {selectedToken?.id === token.id && (
                          <div className="w-3 h-3 rounded-full bg-white" />
                        )}
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Token icon component
export function TokenIcon({ token, size = 'md' }: { token: Token; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-6 h-6 text-sm',
    md: 'w-10 h-10 text-lg',
    lg: 'w-12 h-12 text-xl',
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-bold`}
      style={{
        background: `linear-gradient(135deg, ${token.color}40 0%, ${token.color}20 100%)`,
        border: `1px solid ${token.color}50`,
        color: token.color,
      }}
    >
      {token.icon}
    </div>
  );
}

// Token amount input
interface TokenAmountInputProps {
  value: string;
  onChange: (value: string) => void;
  token: Token | null;
  balance?: string;
  label: string;
  readOnly?: boolean;
}

export function TokenAmountInput({
  value,
  onChange,
  token,
  balance,
  label,
  readOnly = false,
}: TokenAmountInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Only allow numbers and one decimal point
    if (/^\d*\.?\d*$/.test(val)) {
      onChange(val);
    }
  };

  const handleMax = () => {
    if (balance && token) {
      onChange(formatTokenAmount(balance, token.decimals));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm text-white/50">{label}</label>
        {balance && token && (
          <button
            onClick={handleMax}
            className="text-xs text-white/60 hover:text-white transition-colors"
          >
            Balance: {formatTokenAmount(balance, token.decimals)} {token.symbol}
          </button>
        )}
      </div>
      
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={handleChange}
          readOnly={readOnly}
          placeholder="0.00"
          className={`w-full px-4 py-4 pr-20 rounded-xl glass-light border border-white/5 text-2xl font-semibold text-white placeholder-white/20 outline-none transition-all ${
            readOnly 
              ? 'cursor-not-allowed opacity-70' 
              : 'focus:border-white/10 focus:shadow-glass'
          }`}
        />
        
        {token && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-white/50">
            <span className="font-medium">{token.symbol}</span>
          </div>
        )}
      </div>
    </div>
  );
}
