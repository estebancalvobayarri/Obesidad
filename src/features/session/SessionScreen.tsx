import { useEffect, useState } from 'react';
import { bandFor, compareToTarget, FEEDBACK_TEXT, formatRange, type Rpe } from '../../domain/rpe';
import {
  adjustIntensity,
  adjustmentRoom,
  answerRpePrompt,
  elapsedSeconds,
  formatClock,
  isRpePromptDue,
  pause,
  positionAt,
  resume,
  skipRpePrompt,
  targetFor,
  type Adjustment,
  type SessionState,
} from '../../domain/session';
import { playPromptChime } from '../../lib/sound';
import { useWakeLock } from '../../lib/wakeLock';
import { RpePicker } from './RpePicker';
import { RpeScale } from './RpeScale';

interface Props {
  session: SessionState;
  onChange: (next: SessionState) => void;
  onFinish: (final: SessionState) => void;
  /** Se llama cuando el usuario elige «de ahora en adelante». */
  onPersonalOffset: (offset: number) => void;
  soundOn: boolean;
  onToggleSound: () => void;
}

type Sheet = { kind: 'none' } | { kind: 'pause' } | { kind: 'adjust'; direction: 1 | -1 } | { kind: 'scope'; delta: number };

function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    const onVisible = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
  return now;
}

export function SessionScreen({ session, onChange, onFinish, onPersonalOffset, soundOn, onToggleSound }: Props) {
  const now = useNow(250);
  const [sheet, setSheet] = useState<Sheet>({ kind: 'none' });
  const [feedback, setFeedback] = useState<string | null>(null);
  const paused = session.pausedAt !== null;

  useWakeLock(!paused);

  const elapsed = elapsedSeconds(session, now);
  const pos = positionAt(session.plan, elapsed);
  const target = targetFor(session, pos.segment);
  const band = bandFor(target[0]);
  const lastReported = session.rpeLog.length ? session.rpeLog[session.rpeLog.length - 1].value : null;
  const promptDue = isRpePromptDue(session, now) && sheet.kind === 'none';

  // Fin automático.
  useEffect(() => {
    if (pos.done) onFinish(session);
  }, [pos.done]); // eslint-disable-line react-hooks/exhaustive-deps

  // Aviso sonoro (y vibración en Android) cuando toca valorar el esfuerzo.
  useEffect(() => {
    if (!promptDue) return;
    if (soundOn) playPromptChime();
    navigator.vibrate?.([200, 100, 200]);
  }, [promptDue]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!feedback) return;
    const id = window.setTimeout(() => setFeedback(null), 6000);
    return () => window.clearTimeout(id);
  }, [feedback]);

  const answer = (value: Rpe) => {
    onChange(answerRpePrompt(session, Date.now(), value));
    setFeedback(`${value}: ${FEEDBACK_TEXT[compareToTarget(value, target)]}`);
  };

  const openPause = () => {
    onChange(pause(session, Date.now()));
    setSheet({ kind: 'pause' });
  };

  const closeAndResume = (next: SessionState = session) => {
    onChange(resume(next, Date.now()));
    setSheet({ kind: 'none' });
  };

  const applyAdjustment = (delta: number, scope: Adjustment['scope']) => {
    const next = adjustIntensity(session, Date.now(), delta, scope);
    if (scope === 'fromNowOn') onPersonalOffset(next.offset);
    const main = next.plan.segments.find((s) => s.adjustable);
    if (main) setFeedback(`Nueva zona: ${formatRange(targetFor(next, main))}`);
    closeAndResume(next);
  };

  const room = adjustmentRoom(session);
  const segmentTotal = session.plan.totalSeconds;

  return (
    <main className="session">
      <header className="session__top">
        <div>
          <p className="session__phase">{session.plan.phase.name}</p>
          <h1 className="session__segment">{pos.segment.title}</h1>
        </div>
        <button type="button" className="icon-btn" onClick={onToggleSound} aria-pressed={soundOn} aria-label={soundOn ? 'Silenciar el aviso sonoro' : 'Activar el aviso sonoro'}>
          {soundOn ? <SpeakerIcon /> : <SpeakerOffIcon />}
        </button>
      </header>

      <section className="session__clock" aria-live="off">
        <p className="clock">{formatClock(pos.secondsLeftInSegment)}</p>
        <p className="clock__caption">
          para terminar este bloque. Sesión: {formatClock(pos.secondsLeftTotal)}
        </p>
      </section>

      <section className="session__target">
        <p className="target__title">
          {target[0] === target[1] ? (
            <>
              Ve a un <span className="target__value">{target[0]}</span>
            </>
          ) : (
            <>
              Ve entre <span className="target__value">{target[0]}</span> y <span className="target__value">{target[1]}</span>
            </>
          )}
        </p>
        <p className="target__talk">
          {band.label}: {band.talkTest.toLowerCase()}
        </p>
        <RpeScale target={target} reported={lastReported} />
        <p className="session__feedback" role="status">
          {feedback ?? ' '}
        </p>
      </section>

      <div className="progress" aria-hidden="true">
        {session.plan.segments.map((seg, i) => {
          const before = session.plan.segments.slice(0, i).reduce((a, s) => a + s.seconds, 0);
          const fill = Math.min(1, Math.max(0, (elapsed - before) / seg.seconds));
          return (
            <div key={seg.kind} className={`progress__seg progress__seg--${seg.kind}`} style={{ flexGrow: seg.seconds / segmentTotal }}>
              <div className="progress__fill" style={{ width: `${fill * 100}%` }} />
            </div>
          );
        })}
      </div>

      <footer className="session__actions">
        <button type="button" className="btn btn--secondary btn--block" onClick={openPause}>
          Pausar o ajustar
        </button>
      </footer>

      {promptDue && (
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="rpe-q">
          <div className="sheet__panel">
            <h2 id="rpe-q" className="sheet__title">¿Cómo de duro lo notas ahora?</h2>
            <p className="sheet__hint">Toca un número. Tu zona ahora es {formatRange(target)}.</p>
            <RpePicker onPick={answer} />
            <button type="button" className="btn btn--ghost btn--block" onClick={() => onChange(skipRpePrompt(session, Date.now()))}>
              Ahora no
            </button>
          </div>
        </div>
      )}

      {sheet.kind !== 'none' && (
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="pause-title">
          <div className="sheet__panel">
            {sheet.kind === 'pause' && (
              <>
                <h2 id="pause-title" className="sheet__title">Sesión en pausa</h2>
                <p className="sheet__hint">El tiempo está parado. Puedes ajustar la intensidad de la parte principal.</p>
                <button type="button" className="btn btn--primary btn--block" onClick={() => closeAndResume()}>
                  Continuar
                </button>
                <div className="btn-row">
                  <button type="button" className="btn btn--secondary" disabled={room.down === 0} onClick={() => setSheet({ kind: 'adjust', direction: -1 })}>
                    Bajar intensidad
                  </button>
                  <button type="button" className="btn btn--secondary" disabled={room.up === 0} onClick={() => setSheet({ kind: 'adjust', direction: 1 })}>
                    Subir intensidad
                  </button>
                </div>
                {(room.up === 0 || room.down === 0) && (
                  <p className="sheet__note">
                    {room.up === 0 ? 'Ya estás en el máximo de esfuerzo permitido en esta fase.' : 'Ya estás en el mínimo de esfuerzo de esta fase.'}
                  </p>
                )}
                <button type="button" className="btn btn--ghost btn--block" onClick={() => onFinish(session)}>
                  Terminar la sesión
                </button>
              </>
            )}

            {sheet.kind === 'adjust' && (
              <>
                <h2 id="pause-title" className="sheet__title">{sheet.direction === 1 ? '¿Cuánto quieres subir?' : '¿Cuánto quieres bajar?'}</h2>
                <div className="btn-row">
                  {[1, 2].map((points) => {
                    const max = sheet.direction === 1 ? room.up : room.down;
                    return (
                      <button key={points} type="button" className="btn btn--secondary" disabled={points > max} onClick={() => setSheet({ kind: 'scope', delta: points * sheet.direction })}>
                        {sheet.direction === 1 ? '+' : '−'}
                        {points} {points === 1 ? 'punto' : 'puntos'}
                      </button>
                    );
                  })}
                </div>
                <button type="button" className="btn btn--ghost btn--block" onClick={() => setSheet({ kind: 'pause' })}>
                  Volver
                </button>
              </>
            )}

            {sheet.kind === 'scope' && (
              <>
                <h2 id="pause-title" className="sheet__title">¿Para cuándo es el cambio?</h2>
                <button type="button" className="btn btn--primary btn--block" onClick={() => applyAdjustment(sheet.delta, 'today')}>
                  Solo para hoy
                </button>
                <button type="button" className="btn btn--secondary btn--block" onClick={() => applyAdjustment(sheet.delta, 'fromNowOn')}>
                  De ahora en adelante
                </button>
                <p className="sheet__note">«De ahora en adelante» cambia también tus próximas sesiones, siempre dentro de los límites seguros de cada fase.</p>
                <button type="button" className="btn btn--ghost btn--block" onClick={() => setSheet({ kind: 'pause' })}>
                  Volver
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function SpeakerIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
      <path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
