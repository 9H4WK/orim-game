'use client';

import { ReactNode } from 'react';

interface PixelPanelProps {
  children: ReactNode;
  className?: string;
  variant?: 'stone' | 'gold' | 'purple';
}

/**
 * Frosted dusk panel used across ORIM screens.
 * The gold variant carries a lime edge for highlighted content.
 */
export default function PixelPanel({
  children,
  className = '',
  variant = 'stone'
}: PixelPanelProps) {
  return (
    <div
      className={`px-panel ${variant === 'gold' ? 'px-panel-gold' : ''} ${className}`}
      style={{ padding: '24px' }}
    >
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
}
