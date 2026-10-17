import { useState } from 'react';
import { PILOT_LAST_WEEK, phaseForWeek, proposedDaysForWeek } from '../../domain/plan';
import { canTrain, clampMinutes, weekdayIndex, WEEKDAY_LONG, WEEKDAY_SHORT, type Profile } from '../../domain/profile';
import { formatRange } from '../../domain/rpe';
import { allowedOffset, shiftWithin } from '../../domain/session';
import type { SessionRecord } from '../../domain/storage';
import { playPromptChime, unlockSound } from '../../lib/sound';

interface Props {
  profile: Profile;
  week: number;
  weekOverride: number | null;
  onWeekOverride: (week: number | null) => void;
  minutes: number;
  onMinutes: (minutes: number) => void;
  speed: number;
  onSpeed: (speed: number) => void;
  personalOffset: number;
  onResetOffset: () => void;
  history: SessionRecord[];
  onStart: () => void;
  onClearance: () => void;
  onRestartOnboarding: () => void;
}

const SPEEDS = [
  { value: 1, label: 'Real' },
  { value: 10, label: '×10' },
  { value: 60, label: '×60' },
];

/** Lunes de la semana de `date`, a las 00:00. */
function mondayOf(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - weekdayIndex(d));
  return d;
}

export function HomeScreen(props: Props) {
  const { profile, week, minutes, speed, personalOffset, history } = props;
  const [now] = useState(() => new Date());
  const phase = phaseForWeek(week);
  const zone = shiftWithin(phase.target, allowedOffset(phase, personalOffset), phase.limits);
  const today = weekdayIndex(now);
  const isTrainingDay = profile.weekdays.includes(today);
  const nextDay = [1, 2, 3, 4, 5, 6, 7].map((n) => (today + n) % 7).find((d) => profile.weekdays.includes(d));
  const monday = mondayOf(now);
  const doneThisWeek = new Set(
    history.filter((h) => new Date(h.date) >= monday).map((h) => weekdayIndex(new Date(h.date))),
  );
  const allowed = canTrain(profile);

  return (
    <main className="home">
      <header className="home__header">
        <Logo />
        <div>
          <p className="home__brand">Pauta</p>
          <p className="home__sub">Consulta {profile.clinicCode}</p>
        </div>
      </header>

      {!allowed && (
        <section className="card card--warn">
          <p className="phase-line">Pendiente del visto bueno de tu consulta</p>
          <p className="phase-detail">
            Por tus respuestas al cuestionario de salud, tu consulta tiene que revisar tu caso antes de que empieces. Te avisaremos cuando puedas empezar.
          </p>
          <button type="button" className="btn btn--secondary btn--block" onClick={props.onClearance}>
            Simular el visto bueno (solo en el prototipo)
          </button>
        </section>
      )}

      <section className="card">
        <p className="today__kicker">{isTrainingDay ? 'Hoy toca sesión' : 'Hoy es día de descanso'}</p>
        <p className="phase-line">
          Semana {week}. {phase.name}
        </p>
        <p className="phase-detail">
          {isTrainingDay
            ? `${minutes} minutos de ${profile.protocol === 'strength' ? 'ejercicio' : profile.activity.toLowerCase()} a un esfuerzo de ${formatRange(zone)} sobre 10.`
            : nextDay !== undefined
              ? `Tu próxima sesión es el ${WEEKDAY_LONG[nextDay]}${profile.time ? ` a las ${profile.time}` : ''}. Si te apetece, puedes hacer una sesión extra.`
              : ''}
        </p>
        {profile.planMode === 'recommended' && (
          <p className="phase-detail">Propuesta para esta semana: {proposedDaysForWeek(week)} días.</p>
        )}

        <div className="week-strip" aria-label="Esta semana">
          {WEEKDAY_SHORT.map((d, i) => {
            const planned = profile.weekdays.includes(i);
            const done = doneThisWeek.has(i);
            return (
              <div key={d} className={`week-strip__day${planned ? ' is-planned' : ''}${done ? ' is-done' : ''}${i === today ? ' is-today' : ''}`}>
                <span>{d}</span>
                <span className="week-strip__mark" aria-label={done ? 'hecha' : planned ? 'prevista' : 'descanso'}>
                  {done ? '✓' : planned ? '•' : ''}
                </span>
              </div>
            );
          })}
        </div>

        <div className="field">
          <span className="field__label">Duración de hoy</span>
          <div className="stepper">
            <button type="button" className="stepper__btn" onClick={() => props.onMinutes(clampMinutes(minutes - 5))} aria-label="5 minutos menos">
              −
            </button>
            <span className="stepper__value stepper__value--wide">{minutes}′</span>
            <button type="button" className="stepper__btn" onClick={() => props.onMinutes(clampMinutes(minutes + 5))} aria-label="5 minutos más">
              +
            </button>
          </div>
        </div>
      </section>

      {profile.protocol === 'strength' && (
        <p className="notice notice--quiet">Las sesiones de fuerza llegan en el siguiente paso. De momento la sesión es aeróbica.</p>
      )}

      <p className="phase-detail">
        Cada 5 minutos sonará un aviso para que indiques cómo de duro lo notas. Sube el volumen del móvil.{' '}
        <button
          type="button"
          className="link-btn"
          onClick={() => {
            unlockSound();
            playPromptChime();
          }}
        >
          Probar el sonido
        </button>
      </p>

      <button type="button" className="btn btn--primary btn--block btn--big" onClick={props.onStart} disabled={!allowed}>
        {isTrainingDay ? 'Empezar sesión' : 'Hacer una sesión extra'}
      </button>

      {history.length > 0 && (
        <section className="history">
          <h2 className="history__title">Sesiones hechas</h2>
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

      <details className="card card--quiet test-options">
        <summary>Opciones de prueba</summary>
        <div className="field">
          <span className="field__label" id="week-label">
            Semana del plan
          </span>
          <div className="stepper" role="group" aria-labelledby="week-label">
            <button type="button" className="stepper__btn" onClick={() => props.onWeekOverride(Math.max(1, week - 1))} disabled={week <= 1} aria-label="Semana anterior">
              −
            </button>
            <span className="stepper__value">{week}</span>
            <button type="button" className="stepper__btn" onClick={() => props.onWeekOverride(Math.min(PILOT_LAST_WEEK, week + 1))} disabled={week >= PILOT_LAST_WEEK} aria-label="Semana siguiente">
              +
            </button>
          </div>
        </div>
        {props.weekOverride !== null && (
          <button type="button" className="link-btn" onClick={() => props.onWeekOverride(null)}>
            Volver a la semana real
          </button>
        )}
        <span className="field__label" id="speed-label">
          Velocidad de la sesión
        </span>
        <div className="segmented" role="radiogroup" aria-labelledby="speed-label">
          {SPEEDS.map((s) => (
            <button key={s.value} type="button" role="radio" aria-checked={speed === s.value} className={`segmented__opt${speed === s.value ? ' is-on' : ''}`} onClick={() => props.onSpeed(s.value)}>
              {s.label}
            </button>
          ))}
        </div>
        <p className="phase-detail">Con ×60, un minuto de sesión dura un segundo y la pregunta de esfuerzo sale cada 5 segundos.</p>
        {personalOffset !== 0 && (
          <button type="button" className="link-btn" onClick={props.onResetOffset}>
            Quitar el ajuste personal de intensidad ({personalOffset > 0 ? '+' : '−'}
            {Math.abs(personalOffset)})
          </button>
        )}
        <button type="button" className="link-btn" onClick={props.onRestartOnboarding}>
          Volver a hacer el alta
        </button>
      </details>
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
