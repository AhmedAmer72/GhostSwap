'use client';

import React from 'react';
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui';

export function WalletButton() {
  return (
    <div className="wallet-adapter-wrapper">
      <WalletMultiButton 
        className="!bg-white !text-black !font-semibold !rounded-xl !py-2.5 !px-5 !h-auto !border-0 hover:!bg-white/90 !transition-all !shadow-lg hover:!shadow-xl"
      />
    </div>
  );
}
