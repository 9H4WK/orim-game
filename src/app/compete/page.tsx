'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import WorldShell from '@/components/ui/WorldShell';
import styles from '@/components/online/online.module.css';
import { api, PHASE_LABEL, type Competition } from '@/lib/online/api';

export default function CompetitionsPage() {
  const [list, setList] = useState<Competition[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.competitions().then(r => setList(r.competitions)).catch(err => setError(err.message));
  }, []);

  return (
    <WorldShell>
      <div className={styles.page}>
        <header className={styles.head}>
          <span className={styles.tag}>▶ Competitions</span>
          <h1 className={styles.title}>Race for real</h1>
          <p className={styles.sub}>Everyone runs the same maze. Only runs checked by the server count.</p>
        </header>

        <section className={styles.card}>
          {error && <p className={styles.error} role="alert">{error}</p>}
          {!list && !error && <p>Loading…</p>}
          {list && list.length === 0 && (
            <p>No competitions right now. In the meantime, <Link href="/architect">challenge a friend</Link>.</p>
          )}
          {list && list.length > 0 && (
            <div className={styles.list}>
              {list.map(c => (
                <Link key={c.id} href={`/compete/${c.id}`} className={styles.item}>
                  <span>
                    <strong>{c.title}</strong>
                    <br />
                    <span className={styles.itemDim}>
                      {c.mazeSize} maze · {c.country} · top prize {c.prizes[0]} {c.currency} airtime
                    </span>
                  </span>
                  <span className={`${styles.pill} ${c.phase === 'open' ? styles.pillOn : ''}`}>{PHASE_LABEL[c.phase]}</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </WorldShell>
  );
}
