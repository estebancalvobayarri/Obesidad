import { useState } from 'react';
import { formatRange, type Rpe } from '../../domain/rpe';
import { elapsedSeconds, sessionLoad, targetFor, type SessionState } from '../../domain/session';
import type { IntensityFeeling, SessionRecord } from '../../domain/storage';
import { RpePicker } from './RpePicker';

interface Props {
  session: SessionState;
  onSave: (record: SessionRecord) => void;
  onDone: () => void;
}

const FEELINGS: { value: IntensityFeeling; label: string }[] = [
  { value: 'tooHigh', label: 'Demasiado alta' },
  { value: 'right', label: 'Adecuada' },
  { value: 'tooLow', label: 'Baja' },
];

export function SummaryScreen({ session, onSave, onDone }: Props) {
  const [sessionRpe, setSessionRpe] = useState<Rpe | null>(null);
  const [record, setRecord] = useState<SessionRecord | null>(null);
  const doneMinutes = Math.round(elapsedSeconds(session, session.finishedAt ?? Date.now()) / 60);
  const plannedMinutes = Math.round(session.plan.totalSeconds / 60);
  const main = session.plan.segments.find((s) => s.adjustable);

  const save = (feeling: IntensityFeeling) => {
    if (sessionRpe === null) return;
    const rec: SessionRecord = {
      id: `${session.startedAt}`,
      date: new Date(session.startedAt).toISOString(),
      protocol: 'aerobic',
      week: session.plan.week,
      phaseId: session.plan.phase.id,
      plannedMinutes,
      doneMinutes,
      mainTarget: main ? targetFor(session, main) : session.plan.phase.target,
      sessionRpe,
      feeling,
      load: sessionLoad(sessionRpe, doneMinutes),
      rpeLog: session.rpeLog,
      adjustments: session.adjustments,
    };
    onSave(rec);
    setRecord(rec);
  };

  if (record) {
    const reported = record.rpeLog.map((e) => e.value);
    const avg = reported.length ? reported.reduce((a, b) => a + b, 0) / reported.length : null;
    return (
      <main className="summary">
        <h1 className="summary__title">Sesión guardada</h1>
        <dl className="stats">
          <div>
            <dt>Minutos</dt>
            <dd>
              {record.doneMinutes}
              <small> de {record.plannedMinutes}</small>
            </dd>
          </div>
          <div>
            <dt>Esfuerzo de la sesión</dt>
            <dd>{record.sessionRpe}</dd>
          </div>
          <div>
            <dt>Carga (esfuerzo × minutos)</dt>
            <dd>{record.load}</dd>
          </div>
          <div>
            <dt>Esfuerzo medio que indicaste</dt>
            <dd>
              {avg === null ? '—' : avg.toFixed(1).replace('.', ',')}
              <small> zona {formatRange(record.mainTarget)}</small>
            </dd>
          </div>
        </dl>
        <button type="button" className="btn btn--primary btn--block" onClick={onDone}>
          Volver al inicio
        </button>
      </main>
    );
  }

  return (
    <main className="summary">
      <h1 className="summary__title">{doneMinutes >= plannedMinutes ? '¡Sesión completada!' : 'Sesión terminada'}</h1>
      <p className="summary__lead">
        Has hecho {doneMinutes} de {plannedMinutes} minutos. Dos preguntas rápidas para ajustar tu plan.
      </p>
      {sessionRpe === null ? (
        <>
          <h2 className="summary__q">En conjunto, ¿cómo de dura ha sido la sesión?</h2>
          <RpePicker onPick={setSessionRpe} />
        </>
      ) : (
        <>
          <h2 className="summary__q">¿Qué te ha parecido la intensidad?</h2>
          <div className="choice-list">
            {FEELINGS.map((f) => (
              <button key={f.value} type="button" className="btn btn--secondary btn--block" onClick={() => save(f.value)}>
                {f.label}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn--ghost btn--block" onClick={() => setSessionRpe(null)}>
            Cambiar el esfuerzo ({sessionRpe})
          </button>
        </>
      )}
    </main>
  );
}
