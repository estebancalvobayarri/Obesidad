import type { CSSProperties } from 'react';
import { RPE_BANDS, type Rpe } from '../../domain/rpe';

interface Props {
  onPick: (value: Rpe) => void;
}

/** Botones grandes del 0 al 10, agrupados por su descripción. */
export function RpePicker({ onPick }: Props) {
  return (
    <div className="rpe-picker">
      {[...RPE_BANDS].reverse().map((band) => (
        <div className="rpe-picker__row" key={band.label}>
          <div className="rpe-picker__buttons">
            {Array.from({ length: band.to - band.from + 1 }, (_, i) => band.to - i).map((value) => (
              <button
                key={value}
                type="button"
                className="rpe-picker__btn"
                style={{ '--rpe-color': `var(--rpe-${value})` } as CSSProperties}
                onClick={() => onPick(value)}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="rpe-picker__text">
            <strong>{band.label}</strong>
            <span>{band.talkTest}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
