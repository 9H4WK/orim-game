'use client';

import { useRef, useEffect } from 'react';

export interface BackgroundLayer {
  matrix: string[];
  palette: Record<string, string>;
  scale?: number;
  opacity?: number;
  speedX?: number;
  speedY?: number;
}

interface PixelEnvironmentProps {
  layers: BackgroundLayer[];
  className?: string;
}

/**
 * A unified pixel environment renderer.
 * Draws multiple parallax layers onto a single shared canvas.
 */
export default function PixelBackground({
  layers,
  className = ''
}: PixelEnvironmentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 1. Pre-render all matrices to offscreen canvases
    const preparedLayers = layers.map(layer => {
      const { matrix, palette, scale = 4 } = layer;
      const rows = matrix.length;
      const cols = matrix[0].length;
      const pWidth = cols * scale;
      const pHeight = rows * scale;

      const pCanvas = document.createElement('canvas');
      pCanvas.width = pWidth;
      pCanvas.height = pHeight;
      const pCtx = pCanvas.getContext('2d');
      if (pCtx) {
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const char = matrix[r][c];
            if (char === '.' || char === ' ') continue;
            pCtx.fillStyle = palette[char] || '#000';
            pCtx.fillRect(c * scale, r * scale, scale, scale);
          }
        }
      }
      
      return {
        pCanvas,
        pWidth,
        pHeight,
        opacity: layer.opacity ?? 0.5,
        speedX: layer.speedX ?? 0,
        speedY: layer.speedY ?? 0.1,
        offsetX: 0,
        offsetY: 0
      };
    });

    let animId: number;
    const render = () => {
      // Handle resize and clear
      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw each layer
      preparedLayers.forEach(layer => {
        layer.offsetX += layer.speedX;
        layer.offsetY += layer.speedY;

        ctx.globalAlpha = layer.opacity;
        const pattern = ctx.createPattern(layer.pCanvas, 'repeat');
        if (pattern) {
          ctx.fillStyle = pattern;
          ctx.save();
          ctx.translate(layer.offsetX % layer.pWidth, layer.offsetY % layer.pHeight);
          // Fill a bit larger to cover gaps during translation
          ctx.fillRect(-layer.pWidth, -layer.pHeight, canvas.width + layer.pWidth * 2, canvas.height + layer.pHeight * 2);
          ctx.restore();
        }
      });
      
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [layers]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ 
        imageRendering: 'pixelated',
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        pointerEvents: 'none'
      }}
    />
  );
}
