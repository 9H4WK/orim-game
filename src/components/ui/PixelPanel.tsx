'use client';

import { ReactNode } from 'react';
import PixelIcon from './PixelIcon';
import { BORDER_CORNER, UI_PALETTE } from '@/lib/maze/uiPixels';

interface PixelPanelProps {
  children: ReactNode;
  className?: string;
  variant?: 'stone' | 'gold' | 'purple';
}

/**
 * A direct-developed pixel-art panel.
 * Uses code-defined corner matrices and sharp CSS borders.
 */
export default function PixelPanel({ 
  children, 
  className = '',
  variant = 'stone'
}: PixelPanelProps) {
  const borderColor = variant === 'gold' ? 'rgba(202, 138, 4, 0.8)' : variant === 'purple' ? 'rgba(126, 34, 206, 0.8)' : 'rgba(31, 41, 55, 0.8)';
  const bgColor = variant === 'gold' ? 'rgba(26, 16, 10, 0.3)' : 'rgba(10, 6, 20, 0.35)';

  return (
    <div 
      className={className}
      style={{
        position: 'relative',
        padding: '24px',
        background: bgColor,
        border: `4px solid ${borderColor}`,
        boxShadow: `inset 2px 2px 0 rgba(255,255,255,0.05), 8px 8px 0 rgba(0,0,0,0.4)`,
      }}
    >
      {/* Pixel corners */}
      <div style={{ position: 'absolute', top: -4, left: -4 }}>
        <PixelIcon matrix={BORDER_CORNER} size={24} palette={UI_PALETTE} />
      </div>
      <div style={{ position: 'absolute', top: -4, right: -4, transform: 'rotate(90deg)' }}>
         <PixelIcon matrix={BORDER_CORNER} size={24} palette={UI_PALETTE} />
      </div>
      <div style={{ position: 'absolute', bottom: -4, left: -4, transform: 'rotate(-90deg)' }}>
         <PixelIcon matrix={BORDER_CORNER} size={24} palette={UI_PALETTE} />
      </div>
      <div style={{ position: 'absolute', bottom: -4, right: -4, transform: 'rotate(180deg)' }}>
         <PixelIcon matrix={BORDER_CORNER} size={24} palette={UI_PALETTE} />
      </div>

      <div style={{ position: 'relative', zIndex: 10 }}>
        {children}
      </div>
    </div>
  );
}
