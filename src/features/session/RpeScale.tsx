import type { CSSProperties } from 'react';
import { RPE_MAX, RPE_MIN, type Rpe, type RpeRange } from '../../domain/rpe';

interface Props {
  target: RpeRange;
  /** Último valor que indicó el usuario, si lo hay. */
  reported?: Rpe | null;
  compact?: boolean;
}

const LEVELS = Array.from({ length: RPE_MAX - RPE_MIN + 1 }, (_, i) => RPE_MIN + i);

/** La escala 0-10 con la zona objetivo resaltada. Es la pieza central de la sesión. */
export function RpeScale({ target, reported = null, compact = false }: Props) {
  return (
    <div className={`rpe-scale${compact ? ' rpe-scale--compact' : ''}`} role="img" aria-label={`Zona objetivo de esfuerzo: ${target[0] === target[1] ? target[0] : `${target[0]} a ${target[1]}`} sobre 10`}>
      {LEVELS.map((level) => {
        const inTarget = level >= target[0] && level <= target[1];
        const isReported = reported === level;
        return (
          <div
            key={level}
            className={`rpe-scale__cell${inTarget ? ' is-target' : ''}${isReported ? ' is-reported' : ''}`}
            style={{ '--rpe-color': `var(--rpe-${level})` } as CSSProperties}
          >
            <span className="rpe-scale__num">{level}</span>
            {isReported && <span className="rpe-scale__you">tú</span>}
          </div>
        );
      })}
    </div>
  );
}
