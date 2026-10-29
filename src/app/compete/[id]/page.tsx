'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import WorldShell from '@/components/ui/WorldShell';
import styles from '@/components/online/online.module.css';
import { api, CLAIM_STATUS, PHASE_LABEL, type Competition, type Leaderboard } from '@/lib/online/api';
import { formatMs } from '@/lib/online/ranking';

const when = (iso: string) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });

export default function CompetitionPage() {
  const { id } = useParams<{ id: string }>();
  const [comp, setComp] = useState<Competition | null>(null);
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const load = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let live = true;
    Promise.all([api.competition(id), api.leaderboard(id)])
      .then(([c, b]) => { if (live) { setComp(c); setBoard(b); } })
      .catch(err => { if (live) setError(err instanceof Error ? err.message : 'Could not load this competition.'); });
    return () => { live = false; };
  }, [id, tick]);

  return (
    <WorldShell>
      <div className={styles.page}>
        <header className={styles.head}>
          <span className={styles.tag}>▶ Competition{comp ? ` · ${PHASE_LABEL[comp.phase]}` : ''}</span>
          <h1 className={styles.title}>{comp?.title ?? 'Competition'}</h1>
          {comp && <p className={styles.sub}>{comp.mazeSize} maze · the same layout for every player</p>}
        </header>

        {error && <div className={styles.card}><p className={styles.error} role="alert">{error}</p></div>}

        {comp && (
          <>
            {comp.me && comp.me.prize > 0 && comp.phase === 'finalized' && (
              <ClaimPanel comp={comp} onChange={load} />
            )}

            <section className={`${styles.card} ${styles.cardLime}`} aria-labelledby="rules">
              <h2 id="rules">Rules</h2>
              <dl className={styles.facts}>
                <div className={styles.fact}><dt>Opens</dt><dd>{when(comp.startsAt)}</dd></div>
                <div className={styles.fact}><dt>Closes</dt><dd>{when(comp.endsAt)}</dd></div>
                <div className={styles.fact}><dt>Claim by</dt><dd>{when(comp.claimDeadline)}</dd></div>
                <div className={styles.fact}><dt>Prizes ({comp.currency} airtime)</dt><dd>{comp.prizes.map((p, i) => `#${i + 1} ${p}`).join(' · ')}</dd></div>
                <div className={styles.fact}><dt>Who can win</dt><dd>Players with a {comp.country} mobile number</dd></div>
              </dl>
              <p>{comp.rankingRule} Your time is measured by the server from start to finish, and your path is replayed to check it.</p>
              <details className={styles.terms}>
                <summary>Full terms</summary>
                <p>{comp.terms}</p>
              </details>
              {comp.phase === 'open' && (
                <Link href={`/game/compete?id=${encodeURIComponent(comp.id)}`} className={styles.primary}>
                  Enter and play <b aria-hidden="true" />
                </Link>
              )}
              {comp.phase === 'upcoming' && <p className={styles.ok}>Opens {when(comp.startsAt)}.</p>}
              <p className={styles.fine}>Playing never needs a phone number. Winners verify one only to receive airtime. Prizes are reviewed before they are sent.</p>
            </section>

            {board && (
              <section className={styles.card} aria-labelledby="standings">
                <h2 id="standings">{board.final ? 'Final results' : 'Standings'}</h2>
                {board.entries.length === 0 ? (
                  <p>No verified runs yet. Be the first.</p>
                ) : (
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>#</th><th>Explorer</th><th className={styles.num}>Wrong turns</th><th className={styles.num}>Time</th>
                        {board.final && <th className={styles.num}>Prize</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {board.entries.map(e => (
                        <tr key={e.rank} className={e.isYou ? styles.me : ''}>
                          <td>{e.rank}</td>
                          <td>{e.name}{e.isYou ? ' (you)' : ''}</td>
                          <td className={styles.num}>{e.mistakes}</td>
                          <td className={styles.num}>{formatMs(e.durationMs)}</td>
                          {board.final && <td className={styles.num}>{e.prize ? `${e.prize} ${comp.currency}` : '–'}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {!board.final && <p className={styles.fine}>Standings show verified runs only and may change until results are final.</p>}
              </section>
            )}
          </>
        )}

        {!comp && !error && <p className={styles.sub} style={{ textAlign: 'center' }}>Loading…</p>}
      </div>
    </WorldShell>
  );
}

function ClaimPanel({ comp, onChange }: { comp: Competition; onChange: () => void }) {
  const me = comp.me!;
  const claim = me.claim;
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSentTo, setCodeSentTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deadlinePassed] = useState(() => new Date(comp.claimDeadline).getTime() < Date.now());

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={`${styles.card} ${styles.cardLime}`} aria-labelledby="prize">
      <h2 id="prize">You placed #{me.rank}: {me.prize} {comp.currency} airtime</h2>

      {!claim && (deadlinePassed ? (
        <p>The claim deadline has passed.</p>
      ) : (
        <>
          <p>Claim your prize, then confirm the {comp.country} number it should go to.</p>
          <button type="button" className={styles.primary} disabled={busy} onClick={() => run(async () => { await api.claim(comp.id); onChange(); })}>
            Claim prize <b aria-hidden="true" />
          </button>
        </>
      ))}

      {claim && !claim.phoneVerified && (
        codeSentTo ? (
          <form className={styles.form} onSubmit={e => { e.preventDefault(); run(async () => { await api.confirmCode(claim.id, code); onChange(); }); }}>
            <label className={styles.label} htmlFor="otp">Code sent to {codeSentTo}</label>
            <div className={styles.row}>
              <input id="otp" className={styles.input} inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6}
                placeholder="6-digit code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} disabled={busy} />
              <button type="submit" className="btn btn-primary" disabled={busy || code.length !== 6}>Confirm</button>
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setCodeSentTo(''); setCode(''); }}>Use a different number</button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={e => { e.preventDefault(); run(async () => { const r = await api.sendCode(claim.id, phone); setCodeSentTo(r.sentTo); }); }}>
            <label className={styles.label} htmlFor="prize-phone">Your {comp.country} mobile number</label>
            <div className={styles.row}>
              <input id="prize-phone" className={styles.input} type="tel" inputMode="tel" autoComplete="tel"
                placeholder="+254712345678" value={phone} onChange={e => setPhone(e.target.value)} disabled={busy} />
              <button type="submit" className="btn btn-primary" disabled={busy || phone.trim().length < 8}>Text me a code</button>
            </div>
            <p className={styles.fine}>We text a code to prove the number is yours. It is stored encrypted, used only to send this prize, and never shown publicly.</p>
          </form>
        )
      )}

      {claim && claim.phoneVerified && (
        <p className={styles.ok} role="status">{CLAIM_STATUS[claim.status]} {claim.phone && `Number: ${claim.phone}.`}</p>
      )}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </section>
  );
}
