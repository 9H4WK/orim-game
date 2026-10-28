/**
 * ORIM — game sounds and haptics.
 * Tiny synthesized cues (no audio files): footsteps, junction chime, choice,
 * dead end, clear fanfare, loot sparkle. Muting is remembered per device.
 */

type Cue = 'step' | 'junction' | 'choose' | 'deadEnd' | 'clear' | 'loot' | 'start';

const KEY = 'orim-sound';
let ctx: AudioContext | null = null;
let master: GainNode | null = null;

export function isMuted(): boolean {
  try { return localStorage.getItem(KEY) === 'off'; } catch { return false; }
}

export function setMuted(muted: boolean) {
  try { localStorage.setItem(KEY, muted ? 'off' : 'on'); } catch { /* storage blocked */ }
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq: number, at: number, dur: number, type: OscillatorType, vol: number, slideTo?: number) {
  const a = audio();
  if (!a || !master) return;
  const t = a.currentTime + at;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function buzz(pattern: number | number[]) {
  // Browsers only allow vibration after the player has touched the page
  const nav = navigator as Navigator & { userActivation?: { hasBeenActive: boolean } };
  if (nav.userActivation && !nav.userActivation.hasBeenActive) return;
  try { nav.vibrate?.(pattern); } catch { /* not supported */ }
}

let stepAlt = false;

export function play(cue: Cue) {
  if (isMuted()) return;
  switch (cue) {
    case 'step':
      stepAlt = !stepAlt;
      tone(stepAlt ? 150 : 132, 0, 0.05, 'triangle', 0.18, 80);
      break;
    case 'start':
      tone(523, 0, 0.09, 'square', 0.07);
      tone(784, 0.08, 0.14, 'square', 0.07);
      break;
    case 'junction':
      tone(880, 0, 0.12, 'sine', 0.22);
      tone(1320, 0.07, 0.18, 'sine', 0.16);
      buzz(12);
      break;
    case 'choose':
      tone(660, 0, 0.06, 'square', 0.06, 990);
      buzz(8);
      break;
    case 'deadEnd':
      tone(196, 0, 0.18, 'sawtooth', 0.09, 98);
      tone(147, 0.09, 0.22, 'square', 0.05, 73);
      buzz([30, 40, 30]);
      break;
    case 'clear':
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.09, 0.22, 'square', 0.07));
      tone(1568, 0.38, 0.5, 'sine', 0.16);
      buzz([20, 50, 20, 50, 60]);
      break;
    case 'loot':
      [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, i * 0.06, 0.16, 'sine', 0.14));
      buzz([15, 30, 15]);
      break;
  }
}
