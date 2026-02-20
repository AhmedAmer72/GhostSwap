'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Header, GhostParticles, ClaimTrade } from '@/components';

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
