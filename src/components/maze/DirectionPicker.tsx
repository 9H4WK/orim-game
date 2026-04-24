'use client';

import styles from './DirectionPicker.module.css';

type Dir = 'up' | 'right' | 'down' | 'left';

const ARROW_GLYPHS: Record<Dir, string> = {
  up:    '▲',
  right: '▶',
  down:  '▼',
  left:  '◀',
};

const LABELS: Record<Dir, string> = {
  up:    'UP',
  right: 'RIGHT',
  down:  'DOWN',
  left:  'LEFT',
};

interface DirectionPickerProps {
  availableDirections: Dir[];
  onChoose: (dir: Dir) => void;
}

/**
 * Bottom-bar direction selector — does NOT cover the maze.
 */
export default function DirectionPicker({ availableDirections, onChoose }: DirectionPickerProps) {
  const has = (d: Dir) => availableDirections.includes(d);

  return (
    <div className={styles.dirBar}>
      <p className={styles.hint}>🔀 CROSSROADS — CHOOSE PATH</p>

      {/* Up row */}
      <div className={styles.btnRow}>
        {has('up') ? (
          <button
            id="dir-btn-up"
            className={styles.dirBtn}
            onClick={() => onChoose('up')}
          >
            <span className={styles.arrow}>{ARROW_GLYPHS.up}</span>
            <span className={styles.label}>{LABELS.up}</span>
          </button>
        ) : (
          <div className={styles.spacer} />
        )}
      </div>

      {/* Middle row: left ─ right */}
      <div className={styles.btnRow}>
        {has('left') ? (
          <button
            id="dir-btn-left"
            className={styles.dirBtn}
            onClick={() => onChoose('left')}
          >
            <span className={styles.arrow}>{ARROW_GLYPHS.left}</span>
            <span className={styles.label}>{LABELS.left}</span>
          </button>
        ) : (
          <div className={styles.spacer} />
        )}

        {has('right') ? (
          <button
            id="dir-btn-right"
            className={styles.dirBtn}
            onClick={() => onChoose('right')}
          >
            <span className={styles.arrow}>{ARROW_GLYPHS.right}</span>
            <span className={styles.label}>{LABELS.right}</span>
          </button>
        ) : (
          <div className={styles.spacer} />
        )}
      </div>

      {/* Down row */}
      <div className={styles.btnRow}>
        {has('down') ? (
          <button
            id="dir-btn-down"
            className={styles.dirBtn}
            onClick={() => onChoose('down')}
          >
            <span className={styles.arrow}>{ARROW_GLYPHS.down}</span>
            <span className={styles.label}>{LABELS.down}</span>
          </button>
        ) : (
          <div className={styles.spacer} />
        )}
      </div>
    </div>
  );
}
