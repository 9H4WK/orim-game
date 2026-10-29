'use client';

import { useState } from 'react';
import WorldShell from '@/components/ui/WorldShell';
import styles from '@/components/online/online.module.css';
import { api } from '@/lib/online/api';

/** Linked from every challenge text: stop ORIM texting this number */
export default function StopPage() {
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.optOut(phone);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <WorldShell>
      <div className={styles.page}>
        <header className={styles.head}>
          <span className={styles.tag}>▶ Texts from ORIM</span>
          <h1 className={styles.title}>Stop texts</h1>
          <p className={styles.sub}>Friends will still be able to send you a link another way.</p>
        </header>
        <section className={styles.card}>
          {done ? (
            <p className={styles.ok} role="status">Done. ORIM will not text challenges to that number again.</p>
          ) : (
            <form className={styles.form} onSubmit={submit}>
              <label className={styles.label} htmlFor="stop-phone">Your mobile number</label>
              <div className={styles.row}>
                <input id="stop-phone" className={styles.input} type="tel" inputMode="tel" autoComplete="tel"
                  placeholder="+254712345678" value={phone} onChange={e => setPhone(e.target.value)} disabled={busy} />
                <button type="submit" className="btn btn-primary" disabled={busy || phone.trim().length < 8}>Stop texts</button>
              </div>
              {error && <p className={styles.error} role="alert">{error}</p>}
              <p className={styles.fine}>We keep only a scrambled copy of the number, used to block future challenge texts.</p>
            </form>
          )}
        </section>
      </div>
    </WorldShell>
  );
}
