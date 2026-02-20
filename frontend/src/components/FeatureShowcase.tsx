'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Ghost, Shield, Zap, Link2, Eye, Lock } from 'lucide-react';

export function FeatureShowcase() {
  const features = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'MEV Protection',
      description: 'No public mempool means no sandwich attacks or front-running.',
      color: 'from-emerald-500/20 to-emerald-600/5',
      borderColor: 'border-emerald-500/30',
    },
    {
      icon: <Eye className="w-8 h-8" />,
      title: 'Wallet Privacy',
      description: 'ZK proofs mathematically prevent wallet address linking.',
      color: 'from-phantom-500/20 to-phantom-600/5',
      borderColor: 'border-phantom-500/30',
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: 'Atomic Swaps',
      description: 'All-or-nothing execution ensures no partial fills or stuck funds.',
      color: 'from-yellow-500/20 to-yellow-600/5',
      borderColor: 'border-yellow-500/30',
    },
    {
      icon: <Link2 className="w-8 h-8" />,
      title: 'Shareable Links',
      description: 'Web2-style UX - just copy a link and share via any messenger.',
      color: 'from-ghost-500/20 to-ghost-600/5',
      borderColor: 'border-ghost-500/30',
    },
    {
      icon: <Lock className="w-8 h-8" />,
      title: 'Encrypted Records',
      description: 'Trade details stored in encrypted Aleo records on-chain.',
      color: 'from-red-500/20 to-red-600/5',
      borderColor: 'border-red-500/30',
    },
    {
      icon: <Ghost className="w-8 h-8" />,
      title: 'Ghost Mode',
      description: 'Complete transaction graph masking for ultimate privacy.',
      color: 'from-purple-500/20 to-purple-600/5',
      borderColor: 'border-purple-500/30',
    },
  ];

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {features.map((feature, index) => (
        <motion.div
          key={feature.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.1 }}
          className={`ghost-card bg-gradient-to-br ${feature.color} ${feature.borderColor} group hover:scale-[1.02] transition-transform`}
        >
          <div className="text-phantom-400 mb-4 group-hover:text-phantom-300 transition-colors">
            {feature.icon}
          </div>
          <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
          <p className="text-gray-400 text-sm">{feature.description}</p>
        </motion.div>
      ))}
    </div>
  );
}
