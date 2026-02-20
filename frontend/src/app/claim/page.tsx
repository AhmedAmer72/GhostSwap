'use client';

import React from 'react';
import { Header, ClaimTrade } from '@/components';

export default function ClaimPage() {
  return (
    <main className="min-h-screen bg-black bg-noise">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-grid opacity-30 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-radial-gradient pointer-events-none" />
      
      <Header />

      <section className="relative z-10 pt-24 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <ClaimTrade />
        </div>
      </section>
    </main>
  );
}
