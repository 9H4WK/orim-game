'use client';

import { useRef, useEffect } from 'react';
import { ITEM_PALETTE } from '@/lib/maze/itemPixels';

interface PixelIconProps {
  matrix: string[];
  size?: number;
  className?: string;
  glow?: boolean;
  palette?: Record<string, string>;
}

/**
 * Renders a hand-crafted pixel matrix using HTML5 Canvas.
 * Ensures perfectly sharp, pixelated rendering for item icons.
 */
export default function PixelIcon({ 
  matrix, 
  size = 64, 
  className = '',
  glow = false,
  palette = ITEM_PALETTE
}: PixelIconProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (!matrix || matrix.length === 0) return;

    const rows = matrix.length;
    const cols = matrix[0].length;
    
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate pixel scale
    const ps = Math.floor(Math.min(canvas.width / cols, canvas.height / rows));
    
    // Center alignment
    const ox = (canvas.width - cols * ps) / 2;
    const oy = (canvas.height - rows * ps) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const char = matrix[r][c];
        if (char === '.' || char === ' ') continue;
        
        ctx.fillStyle = palette[char] || '#000';
        ctx.fillRect(ox + c * ps, oy + r * ps, ps, ps);
      }
    }
  }, [matrix, size, palette]);

  return (
    <div 
      className={className} 
      style={{ 
        position: 'relative', 
        display: 'inline-flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}
    >
      {glow && (
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            filter: 'blur(20px)',
            opacity: 0.2,
            backgroundColor: '#8b5cf6',
            borderRadius: '9999px'
          }}
        />
      )}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ imageRendering: 'pixelated', position: 'relative', zIndex: 10 }}
      />
    </div>
  );
}
