'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePlayerStore } from '@/lib/store/playerStore';
import styles from './WorldShell.module.css';

type Section = 'worlds' | 'items' | 'create';

const LINKS: { id: Section; href: string; label: string }[] = [
  { id: 'worlds', href: '/stages', label: 'Worlds' },
  { id: 'items', href: '/shop', label: 'Items' },
  { id: 'create', href: '/architect', label: 'Create' },
];

export function OrimLogo() {
  return (
    <Link className={styles.logo} href="/">
      <svg width="24" height="24" viewBox="0 0 12 12" aria-hidden="true" shapeRendering="crispEdges">
        <path fill="#f6eedb" d="M0 0h12v2H2v8h8V4H4v4h2V6h2v4H4v-2H2V2h10v10H0Z" />
        <rect x="6" y="6" width="2" height="2" fill="#d4ff3a" />
      </svg>
      ORIM
    </Link>
  );
}

/**
 * The ORIM world: pixel mountains at dusk, drifting mist, and the shared nav.
 * Every screen outside the landing sits inside this so the journey reads as one place.
 */
export default function WorldShell({ active, children }: { active?: Section; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [menu, setMenu] = useState(false);
  const { coins, totalStars } = usePlayerStore();

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu]);

  return (
    <div className={styles.shell}>
      <div className={styles.sky} aria-hidden="true" />
      <div className={styles.mist} aria-hidden="true" />
      <div className={styles.shade} aria-hidden="true" />

      <nav className={styles.nav}>
        <OrimLogo />

        <div className={styles.menu}>
          {LINKS.map(l => (
            <Link key={l.id} href={l.href} className={active === l.id ? styles.on : ''} aria-current={active === l.id ? 'page' : undefined}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className={styles.account}>
          <span className={styles.purse} title="Stars and coins">
            <span className={styles.star}>★</span>{mounted ? totalStars : 0}
            <i className={styles.coin} />{mounted ? coins : 0}
          </span>
          <button type="button" className={styles.menuBtn} onClick={() => setMenu(true)} aria-label="Open menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      <main className={styles.main}>{children}</main>

      {menu && (
        <div className={styles.sheetBackdrop} onClick={e => { if (e.target === e.currentTarget) setMenu(false); }}>
          <div className={styles.sheet} role="dialog" aria-modal="true" aria-label="Menu">
            <button type="button" className={styles.close} onClick={() => setMenu(false)} aria-label="Close">✕</button>
            <nav className={styles.mobileMenu}>
              <Link href="/">Home</Link>
              {LINKS.map(l => (
                <Link key={l.id} href={l.href} aria-current={active === l.id ? 'page' : undefined}>{l.label}</Link>
              ))}
            </nav>
            <div className={styles.sheetFoot}>
              <span className={styles.sheetPurse}>
                <span className={styles.star}>★</span> {mounted ? totalStars : 0} stars
                <i className={styles.coin} /> {mounted ? coins : 0} coins
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
