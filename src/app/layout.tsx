import type { Metadata } from 'next';
import { Press_Start_2P, Outfit } from 'next/font/google';
import './globals.css';
import { WalletContextProvider } from '@/components/wallet/WalletProvider';

const pixelFont = Press_Start_2P({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-pixel',
});

const outfitFont = Outfit({
  subsets: ['latin'],
  variable: '--font-legendary',
});

export const metadata: Metadata = {
  title: 'ORIM — Pixel Maze Adventure',
  description: 'A Web3 pixel art maze game on Solana. Navigate 100+ stages, collect stars, and customize your character. Powered by MagicBlock VRF.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${pixelFont.variable} ${outfitFont.variable}`}>
      <body className="pixel-bg">
        <WalletContextProvider>
          {children}
        </WalletContextProvider>
      </body>
    </html>
  );
}
