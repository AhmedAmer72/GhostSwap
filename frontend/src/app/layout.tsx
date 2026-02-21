import type { Metadata } from 'next';
import { Providers } from './providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'GhostSwap | Private P2P Token Trading on Aleo',
  description: 'Zero-knowledge OTC desk for trustless, atomic token swaps using shareable links. Trade privately without MEV or wallet doxxing.',
  keywords: ['Aleo', 'GhostSwap', 'Privacy', 'DEX', 'OTC', 'Zero-Knowledge', 'Token Swap', 'Crypto'],
  authors: [{ name: 'GhostSwap' }],
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'GhostSwap | Private P2P Token Trading',
    description: 'Zero-knowledge OTC desk for trustless, atomic token swaps',
    type: 'website',
    siteName: 'GhostSwap',
    images: ['/logo.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GhostSwap | Private P2P Token Trading',
    description: 'Zero-knowledge OTC desk for trustless, atomic token swaps',
    images: ['/logo.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-black text-white min-h-screen antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
