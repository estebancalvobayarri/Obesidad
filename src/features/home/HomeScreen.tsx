import { formatRange } from '../../domain/rpe';
import { MAX_SESSION_MINUTES, MIN_SESSION_MINUTES, phaseForWeek, PILOT_LAST_WEEK, proposedDaysForWeek } from '../../domain/plan';
import { allowedOffset, shiftWithin } from '../../domain/session';
import type { SessionRecord } from '../../domain/storage';

interface Props {
  week: number;
  onWeek: (week: number) => void;
  minutes: number;
  onMinutes: (minutes: number) => void;
  speed: number;
  onSpeed: (speed: number) => void;
  personalOffset: number;
  onResetOffset: () => void;
  history: SessionRecord[];
  onStart: () => void;
}

/** Colores de la barra de duración del plan de negocio. */
function durationLevel(minutes: number): { tone: string; label: string } {
  if (minutes < 20) return { tone: 'red', label: 'Poco tiempo' };
  if (minutes < 30) return { tone: 'yellow', label: 'Algo corto' };
  if (minutes < 40) return { tone: 'green', label: 'Bien' };
  if (minutes < 60) return { tone: 'silver', label: 'Muy bien' };
  return { tone: 'gold', label: 'Excelente' };
}

const SPEEDS = [
  { value: 1, label: 'Real' },
  { value: 10, label: '×10' },
  { value: 60, label: '×60' },
];

export function HomeScreen(props: Props) {
  const { week, minutes, speed, personalOffset, history } = props;
  const phase = phaseForWeek(week);
  const offset = allowedOffset(phase, personalOffset);
  const zone = shiftWithin(phase.target, offset, phase.limits);
  const level = durationLevel(minutes);

  return (
    <main className="home">
      <header className="home__header">
        <Logo />
        <div>
          <p className="home__brand">Pauta</p>
          <p className="home__sub">Prototipo de la sesión guiada de aeróbico</p>
        </div>
      </header>

      <section className="card">
        <div className="field">
          <span className="field__label" id="week-label">Semana del plan</span>
          <div className="stepper" role="group" aria-labelledby="week-label">
            <button type="button" className="stepper__btn" onClick={() => props.onWeek(Math.max(1, week - 1))} aria-label="Semana anterior" disabled={week <= 1}>
              −
            </button>
            <span className="stepper__value">{week}</span>
            <button type="button" className="stepper__btn" onClick={() => props.onWeek(Math.min(PILOT_LAST_WEEK, week + 1))} aria-label="Semana siguiente" disabled={week >= PILOT_LAST_WEEK}>
              +
            </button>
          </div>
        </div>
        <p className="phase-line">{phase.name}</p>
        <p className="phase-detail">
          Propuesta: {proposedDaysForWeek(week)} días por semana, {phase.proposedMinutes} minutos. Esfuerzo {formatRange(zone)} en la parte principal.
        </p>
        {offset !== 0 && (
          <p className="phase-detail">
            Incluye tu ajuste personal de {offset > 0 ? '+' : '−'}
            {Math.abs(offset)}.{' '}
            <button type="button" className="link-btn" onClick={props.onResetOffset}>
              Quitar ajuste
            </button>
          </p>
        )}
      </section>

      <section className="card">
        <label className="field" htmlFor="minutes">
          <span className="field__label">Duración de hoy</span>
          <span className="field__value">{minutes} min</span>
        </label>
        <input
          id="minutes"
          className={`range range--${level.tone}`}
          type="range"
          min={MIN_SESSION_MINUTES}
          max={MAX_SESSION_MINUTES}
          step={5}
          value={minutes}
          onChange={(e) => props.onMinutes(Number(e.target.value))}
        />
        <p className={`level level--${level.tone}`}>{level.label}</p>
        {minutes !== phase.proposedMinutes && (
          <button type="button" className="link-btn" onClick={() => props.onMinutes(phase.proposedMinutes)}>
            Usar la propuesta ({phase.proposedMinutes} min)
          </button>
        )}
      </section>

      <section className="card card--quiet">
        <span className="field__label" id="speed-label">Velocidad de prueba</span>
        <div className="segmented" role="radiogroup" aria-labelledby="speed-label">
          {SPEEDS.map((s) => (
            <button key={s.value} type="button" role="radio" aria-checked={speed === s.value} className={`segmented__opt${speed === s.value ? ' is-on' : ''}`} onClick={() => props.onSpeed(s.value)}>
              {s.label}
            </button>
          ))}
        </div>
        <p className="phase-detail">Solo para probar: con ×60, un minuto de sesión dura un segundo y la pregunta de esfuerzo sale cada 5 segundos.</p>
      </section>

      <button type="button" className="btn btn--primary btn--block btn--big" onClick={props.onStart}>
        Empezar sesión
      </button>

      {history.length > 0 && (
        <section className="history">
          <h2 className="history__title">Sesiones guardadas</h2>
          <ul>
            {history.slice(0, 5).map((h) => (
              <li key={h.id}>
                <span>{new Date(h.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                <span>
                  {h.doneMinutes} min, esfuerzo {h.sessionRpe}
                </span>
                <span className="history__load">carga {h.load}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function Logo() {
  return (
    <svg className="logo" width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">
      <rect width="44" height="44" rx="12" fill="var(--ink)" />
      <rect x="9" y="27" width="5" height="8" rx="2" fill="var(--rpe-2)" />
      <rect x="16.5" y="21" width="5" height="14" rx="2" fill="var(--rpe-4)" />
      <rect x="24" y="15" width="5" height="20" rx="2" fill="var(--rpe-6)" />
      <rect x="31.5" y="9" width="5" height="26" rx="2" fill="var(--rpe-8)" />
    </svg>
  );
}
