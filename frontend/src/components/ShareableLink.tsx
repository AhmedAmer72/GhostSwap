'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Token, formatTokenAmount } from '@/utils/store';
import { TokenIcon } from './TokenSelector';
import { 
  Copy, 
  Check, 
  Share2, 
  Plus,
  ExternalLink,
  QrCode,
  MessageCircle,
  Send,
  ArrowRight,
  Clock,
  Shield,
  Sparkles
} from 'lucide-react';

interface ShareableLinkProps {
  url: string;
  offerToken: Token;
  offerAmount: string;
  requestToken: Token;
  requestAmount: string;
  expiresIn: number;
  onCreateNew: () => void;
}

export function ShareableLink({
  url,
  offerToken,
  offerAmount,
  requestToken,
  requestAmount,
  expiresIn,
  onCreateNew,
}: ShareableLinkProps) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const shareVia = (platform: 'telegram' | 'twitter' | 'discord') => {
    const message = encodeURIComponent(
      `🔮 GhostSwap Trade\n\nI'm offering ${offerAmount} ${offerToken.symbol} for ${requestAmount} ${requestToken.symbol}\n\nClaim your tokens privately:\n${url}`
    );

    const urls = {
      telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${message}`,
      twitter: `https://twitter.com/intent/tweet?text=${message}`,
      discord: url, // Discord doesn't have a share URL, just copy
    };

    if (platform === 'discord') {
      handleCopy();
    } else {
      window.open(urls[platform], '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', duration: 0.5 }}
          className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-phantom-500/20 border border-emerald-500/30 mb-4"
        >
          <Sparkles className="w-8 h-8 text-emerald-400" />
        </motion.div>
        
        <h3 className="text-2xl font-bold text-white mb-2">
          Ghost Link Created! 👻
        </h3>
        <p className="text-gray-400 text-sm">
          Share this link with the other party to complete the trade
        </p>
      </div>

      {/* Trade Summary Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-4 rounded-xl glass-light border border-white/5"
      >
        <div className="flex items-center justify-between gap-4">
          {/* Offer Side */}
          <div className="flex items-center gap-3">
            <TokenIcon token={offerToken} size="lg" />
            <div>
              <p className="text-xs text-white/40">You Send</p>
              <p className="text-lg font-bold text-white">
                {offerAmount} {offerToken.symbol}
              </p>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex-shrink-0">
            <motion.div
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="p-2 rounded-full glass"
            >
              <ArrowRight className="w-5 h-5 text-white/60" />
            </motion.div>
          </div>

          {/* Request Side */}
          <div className="flex items-center gap-3">
            <TokenIcon token={requestToken} size="lg" />
            <div>
              <p className="text-xs text-white/40">You Receive</p>
              <p className="text-lg font-bold text-white">
                {requestAmount} {requestToken.symbol}
              </p>
            </div>
          </div>
        </div>

        {/* Expiration */}
        <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-white/50">
            <Clock className="w-4 h-4" />
            <span>Expires in {expiresIn} hours</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-400">
            <Shield className="w-4 h-4" />
            <span>Protected</span>
          </div>
        </div>
      </motion.div>

      {/* Link Display */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <label className="text-sm text-white/50">Shareable Link</label>
        
        <div className="relative">
          <div className="p-4 rounded-xl glass-light border border-white/5 pr-24 min-h-[80px] flex items-center">
            <span className="break-all text-white/70">
              {url}
            </span>
          </div>
          
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-2">
            <motion.button
              onClick={() => setShowQR(!showQR)}
              className="p-2.5 rounded-lg glass border border-white/10 text-white/50 hover:text-white hover:border-white/20 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <QrCode className="w-5 h-5" />
            </motion.button>
            
            <motion.button
              onClick={handleCopy}
              className={`p-2.5 rounded-lg border transition-all ${
                copied
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'glass border-white/10 text-white/50 hover:text-white hover:border-white/20'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>

        {/* QR Code */}
        {showQR && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex justify-center p-6 rounded-xl bg-white"
          >
            <QRCodeSVG
              value={url}
              size={180}
              level="M"
              includeMargin={false}
              fgColor="#0a0a0f"
              bgColor="#ffffff"
            />
          </motion.div>
        )}
      </motion.div>

      {/* Share Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <label className="text-sm text-white/50">Quick Share</label>
        
        <div className="grid grid-cols-3 gap-3">
          <ShareButton
            icon={<Send className="w-5 h-5" />}
            label="Telegram"
            color="bg-[#0088cc]"
            onClick={() => shareVia('telegram')}
          />
          <ShareButton
            icon={<span className="text-lg font-bold">𝕏</span>}
            label="Twitter"
            color="bg-[#1da1f2]"
            onClick={() => shareVia('twitter')}
          />
          <ShareButton
            icon={<MessageCircle className="w-5 h-5" />}
            label="Discord"
            color="bg-[#5865f2]"
            onClick={() => shareVia('discord')}
          />
        </div>
      </motion.div>

      {/* Create New */}
      <motion.button
        onClick={onCreateNew}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="w-full btn-secondary flex items-center justify-center gap-2"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Plus className="w-5 h-5" />
        <span>Create Another Trade</span>
      </motion.button>

      {/* Security Note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-xs text-white/40"
      >
        🔐 This link contains encrypted trade data. Only the recipient with an Aleo wallet can decrypt and claim.
      </motion.p>
    </div>
  );
}

function ShareButton({
  icon,
  label,
  color,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl ${color} text-white font-medium transition-all hover:opacity-90`}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {icon}
      <span className="text-sm">{label}</span>
    </motion.button>
  );
}
