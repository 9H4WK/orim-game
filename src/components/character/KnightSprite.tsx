'use client';

import { useEffect, useRef } from 'react';
import { loadHero, preloadGear, drawKnight, Facing, Equipped, HeroId } from '@/lib/maze/knight';

/**
 * The ORIM knight, walking in place.
 * Pass `gear` to dress it; the figure then shrinks a little to leave headroom for hats.
 */
export default function KnightSprite({
  className = '',
  facing = 'down',
  fps = 5,
  gear,
  hero = 'knight',
  still = false,
}: {
  className?: string;
  facing?: Facing;
  fps?: number;
  gear?: Equipped;
  hero?: HeroId;
  /** Draw one frame, no animation (item cards) */
  still?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const gearRef = useRef(gear);
  gearRef.current = gear;
  const gearKey = JSON.stringify(gear ?? null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    Promise.all([loadHero(hero), preloadGear()]).then(([frames]) => {
      if (cancelled) return;
      let f = 0;
      const dressed = gearRef.current !== undefined;
      const draw = () => {
        const W = canvas.width;
        const H = canvas.height;
        ctx.clearRect(0, 0, W, H);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        drawKnight(ctx, frames, facing, f, W / 2, H * 0.98, H * (dressed ? 0.72 : 0.94), gearRef.current ?? {}, performance.now());
      };
      draw();
      if (!still && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        timer = setInterval(() => { f = (f + 1) % 4; draw(); }, 1000 / fps);
      }
    });

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [facing, fps, gearKey, hero, still]);

  return (
    <canvas
      ref={ref}
      width={488}
      height={488}
      className={className}
      style={{ width: '100%', height: '100%' }}
      role="img"
      aria-label="The ORIM knight"
    />
  );
}
