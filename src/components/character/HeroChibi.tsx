'use client';

 amusement: true;

import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/lib/store/playerStore';
import { 
  HERO_PALETTE, 
  HERO_DOWN_IDLE, 
  ITEM_OVERLAYS,
  PixelMatrix
} from '@/lib/maze/characterPixels';

interface HeroChibiProps {
  size?: number;
  animate?: boolean;
  className?: string;
  // Overrides for specific previews
  overrideHat?: string | null;
  overrideShirt?: string | null;
  overridePants?: string | null;
  overrideShoes?: string | null;
  overrideAccessory?: string | null;
}

export default function HeroChibi({ 
  size = 140, 
  animate = true, 
  className = '',
  overrideHat,
  overrideShirt,
  overridePants,
  overrideShoes,
  overrideAccessory
}: HeroChibiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const equipped = usePlayerStore((s) => s.equippedItems);
  
  // Choose source of items
  const hatId = overrideHat !== undefined ? overrideHat : equipped.hat;
  const shirtId = overrideShirt !== undefined ? overrideShirt : equipped.shirt;
  const pantsId = overridePants !== undefined ? overridePants : (equipped as any).pants;
  const shoesId = overrideShoes !== undefined ? overrideShoes : (equipped as any).shoes;
  const accId = overrideAccessory !== undefined ? overrideAccessory : (equipped as any).accessory;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let animId: number;

    const render = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const bounce = animate ? Math.floor(Math.sin(frame / 10) * 2) : 0;
      const pixelScale = canvas.width / 14; 
      
      const drawLayer = (itemId: string | null) => {
        if (!itemId || !ITEM_OVERLAYS[itemId]) return;
        const matrix = ITEM_OVERLAYS[itemId].down;
        const yOffset = ITEM_OVERLAYS[itemId].offset;
        
        const rows = matrix.length;
        const cols = matrix[0].length;
        
        const startX = (canvas.width - cols * pixelScale) / 2;
        const startY = (canvas.height - 19 * pixelScale) / 2 + yOffset * pixelScale + bounce;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const char = matrix[r][c];
            if (char === '.' || char === ' ') continue;
            
            ctx.fillStyle = HERO_PALETTE[char] || '#000';
            ctx.fillRect(
              Math.floor(startX + c * pixelScale),
              Math.floor(startY + r * pixelScale),
              Math.ceil(pixelScale),
              Math.ceil(pixelScale)
            );
          }
        }
      };

      // --- Z-ORDER LAYERING ---
      
      // 1. BACK ACC (Wings, etc.)
      if (accId === 'acc_wings') drawLayer(accId);
      
      // 2. BACK SHIRT (Cape)
      if (shirtId?.includes('cape') || shirtId?.includes('rainbow')) drawLayer(shirtId);

      // 3. SHOES
      drawLayer(shoesId);

      // 4. PANTS
      drawLayer(pantsId);

      // 5. BASE HERO
      const baseRowSet = HERO_DOWN_IDLE;
      const startX = (canvas.width - 14 * pixelScale) / 2;
      const startY = (canvas.height - 19 * pixelScale) / 2 + bounce;

      for (let r = 0; r < 19; r++) {
        for (let c = 0; c < 14; c++) {
          const char = baseRowSet[r][c];
          if (char === '.' || char === ' ') continue;
          ctx.fillStyle = HERO_PALETTE[char];
          ctx.fillRect(Math.floor(startX + c * pixelScale), Math.floor(startY + r * pixelScale), Math.ceil(pixelScale), Math.ceil(pixelScale));
        }
      }

      // 6. SHIRT OVERLAY (If not a cape)
      if (shirtId && !shirtId.includes('cape') && !shirtId.includes('rainbow')) {
        drawLayer(shirtId);
      }

      // 7. HAT
      drawLayer(hatId);

      // 8. FRONT ACC (Sword, etc.)
      if (accId && accId !== 'acc_wings') drawLayer(accId);

      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [animate, hatId, shirtId, pantsId, shoesId, accId]);

  return (
    <canvas 
      ref={canvasRef}
      width={size}
      height={Math.floor(size * (19/14))} // Maintain 14:19 aspect ratio
      className={className}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
