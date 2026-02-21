'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';

// Dynamic imports with SSR disabled
const Header = dynamic(() => import('@/components/Header').then(mod => mod.Header), { ssr: false });
const GhostParticles = dynamic(() => import('@/components/GhostParticles').then(mod => mod.GhostParticles), { ssr: false });
const ClaimTrade = dynamic(() => import('@/components/ClaimTrade').then(mod => mod.ClaimTrade), { ssr: false });

export default function ClaimWithLinkPage() {
  const params = useParams();
  const linkData = params.linkData as string;

  return (
    <main className="min-h-screen bg-ghost-gradient">
      <GhostParticles />
      <Header />

      <section className="relative pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          <ClaimTrade linkData={linkData} />
        </div>
      </section>
    </main>
  );
}
