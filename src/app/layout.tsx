import type { Metadata } from 'next';
import { Bowlby_One, Inter_Tight, Silkscreen } from 'next/font/google';
import './globals.css';
import { WalletContextProvider } from '@/components/wallet/WalletProvider';

const displayFont = Bowlby_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bowlby',
});

const bodyFont = Inter_Tight({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-inter-tight',
});

const pixelFont = Silkscreen({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-silkscreen',
});

export const metadata: Metadata = {
  title: 'ORIM — Find the way out',
  description: 'A pixel labyrinth game on Solana. Clear 100 stages across five worlds, equip loot that changes your hero, and mint mazes of your own. Powered by MagicBlock VRF.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${displayFont.variable} ${bodyFont.variable} ${pixelFont.variable}`}>
      <body>
        <WalletContextProvider>
          {children}
        </WalletContextProvider>
      </body>
    </html>
  );
}
