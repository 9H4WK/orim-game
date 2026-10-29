'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import WorldShell from '@/components/ui/WorldShell';
import styles from '@/components/online/online.module.css';
import { api, INVITE_STATUS, type ChallengeInfo, type ChallengeResults } from '@/lib/online/api';
import { formatMs, RANKING_RULE } from '@/lib/online/ranking';

const OUTCOME: Record<ChallengeResults['comparison']['outcome'], string> = {
  win: 'You’re ahead!',
  lose: 'They’re ahead. Try again?',
  tie: 'Dead heat.',
  pending: '',
};

export default function ChallengePage() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<ChallengeInfo | null>(null);
  const [results, setResults] = useState<ChallengeResults | null>(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let live = true;
    Promise.all([api.challenge(token), api.challengeResults(token)])
      .then(([i, r]) => { if (live) { setInfo(i); setResults(r); setError(''); } })
      .catch(err => { if (live) setError(err instanceof Error ? err.message : 'Could not load this challenge.'); });
    return () => { live = false; };
  }, [token, tick]);

  // Keeps the comparison and text-delivery status fresh while the page is open
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') reload(); }, 10_000);
    return () => clearInterval(t);
  }, [reload]);

  const you = results?.comparison.you ?? null;
  const them = results?.comparison.them ?? null;
  const outcome = results?.comparison.outcome ?? 'pending';
  const playHref = `/game/challenge?token=${encodeURIComponent(token)}`;

  return (
    <WorldShell>
      <div className={styles.page}>
        <header className={styles.head}>
          <span className={styles.tag}>
            ▶ {info ? (info.isCreator ? 'Your challenge' : `Challenge from ${info.creatorName}`) : 'Challenge'}
          </span>
          <h1 className={styles.title}>Beat the time</h1>
          {info && (
            <p className={styles.sub}>
              One {info.width}×{info.height} maze, the same for everyone. {info.expired ? 'This challenge has ended.' : `Open until ${new Date(info.expiresAt).toLocaleDateString()}.`}
            </p>
          )}
        </header>

        {error && <div className={styles.card}><p className={styles.error} role="alert">{error}</p></div>}

        {info && results && (
          <>
            <section className={`${styles.card} ${styles.cardLime}`} aria-label="Head to head">
              <div className={styles.versus}>
                <Side label="You" result={you} waiting={info.isCreator ? 'Set your time' : 'Your turn'} />
                <span className={styles.vs} aria-hidden="true">VS</span>
                <Side
                  label={them?.name ?? (info.isCreator ? 'Your friend' : info.creatorName)}
                  result={them}
                  waiting={info.isCreator ? 'Waiting for a friend' : 'Not played yet'}
                />
              </div>
              {outcome !== 'pending' && <p className={styles.outcome} role="status">{OUTCOME[outcome]}</p>}
              <p className={styles.rule}>{RANKING_RULE} Times are measured by the server.</p>

              {!info.expired && (
                <Link href={playHref} className={styles.primary}>
                  {you ? 'Play again' : info.isCreator ? 'Set your time' : 'Play this maze'} <b aria-hidden="true" />
                </Link>
              )}
            </section>

            {info.isCreator && !info.expired && <SharePanel info={info} hasResult={!!you} onSent={reload} />}

            {results.participants.length > 0 && (
              <section className={styles.card} aria-labelledby="all-times">
                <h2 id="all-times">Verified times</h2>
                <table className={styles.table}>
                  <thead>
                    <tr><th>#</th><th>Explorer</th><th className={styles.num}>Wrong turns</th><th className={styles.num}>Time</th></tr>
                  </thead>
                  <tbody>
                    {results.participants.map(p => (
                      <tr key={p.rank} className={p.isYou ? styles.me : ''}>
                        <td>{p.rank}</td>
                        <td>{p.name}{p.isYou ? ' (you)' : p.isCreator ? ' (sender)' : ''}</td>
                        <td className={styles.num}>{p.mistakes}</td>
                        <td className={styles.num}>{formatMs(p.durationMs)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}
          </>
        )}

        {!info && !error && <p className={styles.sub} style={{ textAlign: 'center' }}>Loading…</p>}
      </div>
    </WorldShell>
  );
}

function Side({ label, result, waiting }: { label: string; result: { durationMs: number; mistakes: number } | null; waiting: string }) {
  return (
    <div className={styles.side}>
      <span className={styles.sideName}>{label}</span>
      {result ? (
        <>
          <span className={styles.sideTime}>{formatMs(result.durationMs)}</span>
          <span className={styles.sideTurns}>{result.mistakes} wrong turn{result.mistakes === 1 ? '' : 's'}</span>
        </>
      ) : (
        <span className={styles.sideWait}>{waiting}</span>
      )}
    </div>
  );
}

function SharePanel({ info, hasResult, onSent }: { info: ChallengeInfo; hasResult: boolean; onSent: () => void }) {
  const [copied, setCopied] = useState(false);
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  // Only rendered after the challenge loads in the browser, so these are safe to read directly
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const link = typeof window === 'undefined' ? '' : `${window.location.origin}/c/${info.token}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage({ ok: false, text: 'Copy failed. Select the link and copy it by hand.' });
    }
  };

  const share = () => {
    navigator.share({ title: 'ORIM challenge', text: 'Can you escape this maze faster than me?', url: link }).catch(() => {});
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    // Say what is missing rather than leaving a dead button
    const missing = !hasResult
      ? 'Play the maze first, so your friend has a time to beat.'
      : phone.replace(/\D/g, '').length < 9
        ? 'Enter your friend’s phone number.'
        : !consent
          ? 'Tick the box to confirm your friend agreed to get a text.'
          : null;
    if (missing) {
      setMessage({ ok: false, text: missing });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await api.sendInvite(info.token, phone);
      setMessage(res.status === 'accepted'
        ? { ok: true, text: `Text sent to ${res.recipient}. We’ll show here when it’s delivered.` }
        : res.status === 'unknown'
          ? { ok: false, text: `We asked the network to text ${res.recipient} but have not heard back yet.` }
          : { ok: false, text: `The text to ${res.recipient} could not be sent.` });
      setPhone('');
      setConsent(false);
      onSent();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : 'Could not send the text.' });
    } finally {
      setBusy(false);
    }
  };


  return (
    <section className={styles.card} aria-labelledby="share-title">
      <h2 id="share-title">Send it to a friend</h2>

      <form className={styles.form} onSubmit={send}>
        <label className={styles.label} htmlFor="sms-to">Friend’s phone number</label>
        <div className={styles.row}>
          <input
            id="sms-to"
            className={styles.input}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="0712 345 678"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            disabled={busy || !info.smsEnabled}
          />
          <button type="submit" className="btn btn-primary" disabled={busy || !info.smsEnabled}>
            {busy ? 'Sending…' : 'Send text'}
          </button>
        </div>
        <label className={styles.check}>
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} disabled={busy || !info.smsEnabled} />
          <span>My friend agreed to get one text from ORIM. They can stop texts at any time.</span>
        </label>
        {!info.smsEnabled ? (
          <p className={styles.fine}>Texting isn’t available right now. Share the link below instead.</p>
        ) : !hasResult ? (
          <p className={styles.fine}>
            Play the maze first, so your friend has a time to beat.{' '}
            <a href={`/game/challenge?token=${encodeURIComponent(info.token)}`}>Set your time</a>
          </p>
        ) : (
          <p className={styles.fine}>
            They get a short text from ORIM, sent through Africa’s Talking, with your time and this link.
            We never show their number to anyone.
          </p>
        )}
      </form>

      <div className={styles.form}>
        <span className={styles.label}>Or share the link</span>
        <div className={styles.row}>
          <input className={styles.input} value={link} readOnly aria-label="Challenge link" onFocus={e => e.currentTarget.select()} />
          <button type="button" className="btn btn-secondary" onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
          {canShare && <button type="button" className="btn btn-secondary" onClick={share}>Share</button>}
        </div>
      </div>

      {message && <p className={message.ok ? styles.ok : styles.error} role="status">{message.text}</p>}

      {info.invitations.length > 0 && (
        <div className={styles.list} aria-label="Texts sent">
          {info.invitations.map(inv => (
            <div key={inv.sentAt + inv.recipient} className={styles.item}>
              <span>{inv.recipient}</span>
              <span className={styles.itemDim}>{INVITE_STATUS[inv.status]}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
