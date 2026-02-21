'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { WalletButton } from './WalletButton';
import { History, PlusCircle, Link2 } from 'lucide-react';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Glass background */}
      <div className="absolute inset-0 glass-dark border-b border-white/5" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <motion.div
              className="relative"
              animate={{ y: [0, -2, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image src="/logo.png" alt="GhostSwap" width={36} height={36} className="rounded-xl" />
            </motion.div>
            
            <div className="flex flex-col">
              <span className="font-semibold text-lg text-white">
                GhostSwap
              </span>
              <span className="text-[10px] text-white/40 -mt-1 tracking-widest uppercase">
                Private P2P
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink href="/trade" icon={<PlusCircle className="w-4 h-4" />}>
              Create Trade
            </NavLink>
            <NavLink href="/claim" icon={<Link2 className="w-4 h-4" />}>
              Claim Link
            </NavLink>
            <NavLink href="/history" icon={<History className="w-4 h-4" />}>
              History
            </NavLink>
          </nav>

          {/* Wallet */}
          <WalletButton />
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all duration-200"
    >
      {icon}
      <span className="text-sm font-medium">{children}</span>
    </Link>
  );
}
