import { useState, type ReactNode } from 'react';
import { MAX_SESSION_MINUTES, MIN_SESSION_MINUTES } from '../../domain/plan';
import {
  AEROBIC_ACTIVITIES,
  clampMinutes,
  daysLevel,
  LEVEL_LABEL,
  minutesLevel,
  needsMedicalClearance,
  parseNumber,
  PARQ_QUESTIONS,
  recommendedPlan,
  toggleWeekday,
  validateBodyField,
  WEEKDAY_LONG,
  WEEKDAY_SHORT,
  type BodyField,
  type PlanMode,
  type Profile,
  type Protocol,
  type Sex,
} from '../../domain/profile';
import { RPE_BANDS } from '../../domain/rpe';
import { RpeScale } from '../session/RpeScale';

interface Props {
  onComplete: (profile: Profile) => void;
}

const STEPS = ['welcome', 'body', 'parq', 'rpe', 'protocol', 'prefs', 'summary'] as const;
type Step = (typeof STEPS)[number];

/** Borrador del alta: los campos de texto se guardan tal cual y se validan al avanzar. */
interface Draft {
  clinicCode: string;
  age: string;
  sex: Sex | null;
  height: string;
  weight: string;
  parq: (boolean | null)[];
  protocol: Protocol | null;
  activity: string | null;
  planMode: PlanMode | null;
  weekdays: number[];
  minutes: number;
  time: string;
}

const INITIAL: Draft = {
  clinicCode: '',
  age: '',
  sex: null,
  height: '',
  weight: '',
  parq: PARQ_QUESTIONS.map(() => null),
  protocol: null,
  activity: null,
  planMode: null,
  weekdays: recommendedPlan().weekdays,
  minutes: recommendedPlan().minutes,
  time: '',
};

export function Onboarding({ onComplete }: Props) {
  const [step, setStep] = useState<Step>('welcome');
  const [draft, setDraft] = useState<Draft>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const index = STEPS.indexOf(step);

  const update = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const go = (next: Step) => {
    setErrors({});
    setStep(next);
    window.scrollTo(0, 0);
  };
  const back = () => go(STEPS[Math.max(0, index - 1)]);

  const nextFromWelcome = () => {
    if (draft.clinicCode.trim().length < 4) {
      setErrors({ clinicCode: 'Escribe el código que te ha dado tu consulta (al menos 4 caracteres).' });
      return;
    }
    go('body');
  };

  const nextFromBody = () => {
    const found: Record<string, string> = {};
    const fields: [BodyField, string][] = [
      ['age', draft.age],
      ['heightCm', draft.height],
      ['weightKg', draft.weight],
    ];
    for (const [field, text] of fields) {
      const message = validateBodyField(field, parseNumber(text));
      if (message) found[field] = message;
    }
    if (!draft.sex) found.sex = 'Elige una opción.';
    setErrors(found);
    if (Object.keys(found).length === 0) go('parq');
  };

  const nextFromParq = () => {
    if (draft.parq.some((a) => a === null)) {
      setErrors({ parq: 'Responde a todas las preguntas.' });
      return;
    }
    go('rpe');
  };

  const nextFromProtocol = () => {
    if (!draft.protocol) return setErrors({ protocol: 'Elige un tipo de ejercicio.' });
    if (draft.protocol === 'aerobic' && !draft.activity) return setErrors({ activity: 'Elige una actividad.' });
    go('prefs');
  };

  const nextFromPrefs = () => {
    if (!draft.planMode) return setErrors({ planMode: 'Elige una opción.' });
    if (draft.weekdays.length === 0) return setErrors({ weekdays: 'Elige al menos un día.' });
    go('summary');
  };

  const finish = () => {
    onComplete({
      clinicCode: draft.clinicCode.trim().toUpperCase(),
      age: Math.round(parseNumber(draft.age) ?? 0),
      sex: draft.sex ?? 'female',
      heightCm: parseNumber(draft.height) ?? 0,
      weightKg: parseNumber(draft.weight) ?? 0,
      parq: draft.parq.map(Boolean),
      medicalClearance: false,
      protocol: draft.protocol ?? 'aerobic',
      activity: draft.protocol === 'aerobic' ? (draft.activity ?? 'Andar') : 'Fuerza en casa',
      planMode: draft.planMode ?? 'recommended',
      weekdays: draft.weekdays,
      minutes: draft.minutes,
      time: draft.time || null,
      startDate: new Date().toISOString(),
    });
  };

  return (
    <main className="onb">
      {step !== 'welcome' && (
        <header className="onb__top">
          <button type="button" className="link-btn" onClick={back}>
            Atrás
          </button>
          <p className="onb__step">
            Paso {index} de {STEPS.length - 1}
          </p>
        </header>
      )}

      {step === 'welcome' && (
        <section className="onb__body">
          <div className="onb__clinic" aria-hidden="true">
            <ClinicMark />
          </div>
          <h1 className="onb__title">Tu plan de ejercicio, a tu ritmo</h1>
          <p className="onb__lead">
            Tu consulta te ha invitado a Pauta. Vamos a preparar un plan de ejercicio adaptado a ti. Tardarás unos 5 minutos.
          </p>
          <Field label="Código de tu consulta" error={errors.clinicCode} htmlFor="code">
            <input
              id="code"
              className="input input--code"
              autoComplete="off"
              autoCapitalize="characters"
              value={draft.clinicCode}
              onChange={(e) => update({ clinicCode: e.target.value })}
              placeholder="Por ejemplo, CARO24"
            />
          </Field>
          <InstallHint />
          <Footer onNext={nextFromWelcome} label="Empezar" />
        </section>
      )}

      {step === 'body' && (
        <section className="onb__body">
          <h1 className="onb__title">Unos datos sobre ti</h1>
          <p className="onb__lead">Sirven para ajustar tu plan. Solo los verá tu consulta.</p>
          <NumberField id="age" label="Edad" unit="años" value={draft.age} onChange={(age) => update({ age })} error={errors.age} />
          <Field label="Sexo" error={errors.sex}>
            <div className="choice-row">
              {(
                [
                  ['female', 'Mujer'],
                  ['male', 'Hombre'],
                ] as const
              ).map(([value, label]) => (
                <button key={value} type="button" className={`choice${draft.sex === value ? ' is-on' : ''}`} aria-pressed={draft.sex === value} onClick={() => update({ sex: value })}>
                  {label}
                </button>
              ))}
            </div>
          </Field>
          <NumberField id="height" label="Altura" unit="cm" value={draft.height} onChange={(height) => update({ height })} error={errors.heightCm} />
          <NumberField id="weight" label="Peso" unit="kg" value={draft.weight} onChange={(weight) => update({ weight })} error={errors.weightKg} decimal />
          <Footer onNext={nextFromBody} />
        </section>
      )}

      {step === 'parq' && (
        <section className="onb__body">
          <h1 className="onb__title">Antes de empezar, tu salud</h1>
          <p className="onb__lead">Siete preguntas para saber si puedes empezar ya o si antes necesitas el visto bueno de tu consulta.</p>
          <ol className="parq">
            {PARQ_QUESTIONS.map((q, i) => (
              <li key={i} className="parq__item">
                <p className="parq__q">{q.text}</p>
                {q.note && <p className="parq__note">{q.note}</p>}
                <div className="choice-row">
                  {[true, false].map((value) => (
                    <button
                      key={String(value)}
                      type="button"
                      className={`choice${draft.parq[i] === value ? ' is-on' : ''}`}
                      aria-pressed={draft.parq[i] === value}
                      onClick={() => update({ parq: draft.parq.map((a, j) => (j === i ? value : a)) })}
                    >
                      {value ? 'Sí' : 'No'}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ol>
          {errors.parq && <p className="field__error">{errors.parq}</p>}
          {draft.parq.every((a) => a !== null) && needsMedicalClearance(draft.parq.map(Boolean)) && (
            <p className="notice">
              Has respondido «sí» a alguna pregunta. Puedes terminar el alta, pero no podrás empezar a entrenar hasta que tu consulta te dé el visto bueno.
            </p>
          )}
          <Footer onNext={nextFromParq} />
        </section>
      )}

      {step === 'rpe' && (
        <section className="onb__body">
          <h1 className="onb__title">Cómo medimos el esfuerzo</h1>
          <p className="onb__lead">
            No necesitas pulsómetro. Durante el ejercicio te preguntaremos cómo de duro lo notas, del 0 al 10. Cada sesión te dirá a qué número tienes que ir.
          </p>
          <RpeScale target={[5, 6]} />
          <dl className="rpe-legend">
            {RPE_BANDS.map((b) => (
              <div key={b.label} className="rpe-legend__row">
                <dt>
                  <span className="rpe-legend__num">{b.from === b.to ? b.from : `${b.from}-${b.to}`}</span> {b.label}
                </dt>
                <dd>{b.talkTest}</dd>
              </div>
            ))}
          </dl>
          <p className="notice notice--quiet">
            Un truco: si puedes hablar pero no cantar, estás en un esfuerzo moderado (5-6). Las primeras semanas irás más suave.
          </p>
          <Footer onNext={() => go('protocol')} label="Entendido" />
        </section>
      )}

      {step === 'protocol' && (
        <section className="onb__body">
          <h1 className="onb__title">¿Qué tipo de ejercicio prefieres?</h1>
          <p className="onb__lead">Puedes cambiarlo cuando quieras.</p>
          <div className="option-list">
            <OptionCard
              selected={draft.protocol === 'aerobic'}
              onSelect={() => update({ protocol: 'aerobic' })}
              title="Aeróbico"
              text="Andar, bici, elíptica, nadar… La sesión es continua y tú eliges la actividad."
            />
            <OptionCard
              selected={draft.protocol === 'strength'}
              onSelect={() => update({ protocol: 'strength', activity: null })}
              title="Fuerza"
              text="Ejercicios en casa o con gomas para ganar fuerza y conservar músculo."
            />
          </div>
          {errors.protocol && <p className="field__error">{errors.protocol}</p>}
          {draft.protocol === 'aerobic' && (
            <Field label="¿Qué actividad vas a hacer?" error={errors.activity}>
              <div className="chip-grid">
                {AEROBIC_ACTIVITIES.map((a) => (
                  <button key={a} type="button" className={`choice${draft.activity === a ? ' is-on' : ''}`} aria-pressed={draft.activity === a} onClick={() => update({ activity: a })}>
                    {a}
                  </button>
                ))}
              </div>
            </Field>
          )}
          {draft.protocol === 'strength' && (
            <p className="notice notice--quiet">En este prototipo las sesiones de fuerza todavía no están listas: de momento verás la sesión aeróbica.</p>
          )}
          <Footer onNext={nextFromProtocol} />
        </section>
      )}

      {step === 'prefs' && (
        <section className="onb__body">
          <h1 className="onb__title">¿Cómo quieres tu plan?</h1>
          <div className="option-list">
            <OptionCard
              selected={draft.planMode === 'recommended'}
              onSelect={() => update({ planMode: 'recommended', ...recommendedPlan() })}
              title="Estoy motivado, hazme el mejor plan"
              text="Seguirás la propuesta de la app: empieza con 3 días por semana y va subiendo poco a poco."
            />
            <OptionCard
              selected={draft.planMode === 'custom'}
              onSelect={() => update({ planMode: 'custom' })}
              title="Quiero elegir el plan a mi medida"
              text="Tú decides cuántos días entrenas y cuánto dura cada sesión."
            />
          </div>
          {errors.planMode && <p className="field__error">{errors.planMode}</p>}

          {draft.planMode && (
            <>
              <Field label="¿Qué días vas a entrenar?" error={errors.weekdays}>
                <div className="weekdays" role="group" aria-label="Días de entrenamiento">
                  {WEEKDAY_SHORT.map((d, i) => (
                    <button
                      key={d}
                      type="button"
                      className={`weekday${draft.weekdays.includes(i) ? ' is-on' : ''}`}
                      aria-pressed={draft.weekdays.includes(i)}
                      aria-label={WEEKDAY_LONG[i]}
                      onClick={() => update({ weekdays: toggleWeekday(draft.weekdays, i) })}
                    >
                      {d}
                    </button>
                  ))}
                </div>
                {draft.weekdays.length > 0 && (
                  <LevelLine
                    tone={daysLevel(draft.weekdays.length)}
                    text={`${draft.weekdays.length} ${draft.weekdays.length === 1 ? 'día' : 'días'} por semana`}
                  />
                )}
              </Field>

              {draft.planMode === 'custom' ? (
                <Field label="¿Cuánto quieres que dure cada sesión?" htmlFor="minutes">
                  <div className="field">
                    <span className="field__value">{draft.minutes} min</span>
                  </div>
                  <input
                    id="minutes"
                    className="range"
                    type="range"
                    min={MIN_SESSION_MINUTES}
                    max={MAX_SESSION_MINUTES}
                    step={5}
                    value={draft.minutes}
                    onChange={(e) => update({ minutes: clampMinutes(Number(e.target.value)) })}
                  />
                  <LevelLine tone={minutesLevel(draft.minutes)} text={`${draft.minutes} minutos por sesión`} />
                </Field>
              ) : (
                <p className="notice notice--quiet">Sesiones de {draft.minutes} minutos, que irán cambiando según la fase del plan.</p>
              )}

              <Field label="¿A qué hora? (opcional)" htmlFor="time">
                <input id="time" className="input input--time" type="time" value={draft.time} onChange={(e) => update({ time: e.target.value })} />
                <p className="field__hint">Tener una hora fija ayuda a no saltarse sesiones.</p>
              </Field>
            </>
          )}
          <Footer onNext={nextFromPrefs} />
        </section>
      )}

      {step === 'summary' && (
        <section className="onb__body">
          <h1 className="onb__title">Tu plan está listo</h1>
          <dl className="plan-summary">
            <div>
              <dt>Ejercicio</dt>
              <dd>{draft.protocol === 'strength' ? 'Fuerza' : `Aeróbico: ${draft.activity?.toLowerCase()}`}</dd>
            </div>
            <div>
              <dt>Días</dt>
              <dd>{draft.weekdays.map((d) => WEEKDAY_LONG[d]).join(', ')}</dd>
            </div>
            <div>
              <dt>Duración</dt>
              <dd>
                {draft.minutes} minutos{draft.time ? `, a las ${draft.time}` : ''}
              </dd>
            </div>
            <div>
              <dt>Para empezar</dt>
              <dd>4 semanas de adaptación a un esfuerzo suave (4 sobre 10).</dd>
            </div>
          </dl>
          {needsMedicalClearance(draft.parq.map(Boolean)) && (
            <p className="notice">Recuerda: antes de la primera sesión necesitas el visto bueno de tu consulta.</p>
          )}
          <Footer onNext={finish} label="Ir a mi plan" />
        </section>
      )}
    </main>
  );
}

/* ---------- Piezas pequeñas ---------- */

function Field({ label, error, htmlFor, children }: { label: string; error?: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className={`fieldset${error ? ' has-error' : ''}`}>
      {htmlFor ? (
        <label className="field__label" htmlFor={htmlFor}>
          {label}
        </label>
      ) : (
        <p className="field__label">{label}</p>
      )}
      {children}
      {error && <p className="field__error">{error}</p>}
    </div>
  );
}

function NumberField(props: { id: string; label: string; unit: string; value: string; onChange: (v: string) => void; error?: string; decimal?: boolean }) {
  return (
    <Field label={props.label} error={props.error} htmlFor={props.id}>
      <div className="input-unit">
        <input
          id={props.id}
          className="input"
          inputMode={props.decimal ? 'decimal' : 'numeric'}
          autoComplete="off"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          aria-invalid={Boolean(props.error)}
          aria-label={`${props.label} en ${props.unit}`}
        />
        <span className="input-unit__unit">{props.unit}</span>
      </div>
    </Field>
  );
}

function OptionCard({ selected, onSelect, title, text }: { selected: boolean; onSelect: () => void; title: string; text: string }) {
  return (
    <button type="button" className={`option-card${selected ? ' is-on' : ''}`} aria-pressed={selected} onClick={onSelect}>
      <span className="option-card__title">{title}</span>
      <span className="option-card__text">{text}</span>
    </button>
  );
}

function LevelLine({ tone, text }: { tone: keyof typeof LEVEL_LABEL; text: string }) {
  return (
    <p className={`level level--${tone}`}>
      {LEVEL_LABEL[tone]}: <span className="level__text">{text}</span>
    </p>
  );
}

function Footer({ onNext, label = 'Continuar' }: { onNext: () => void; label?: string }) {
  return (
    <div className="onb__footer">
      <button type="button" className="btn btn--primary btn--block btn--big" onClick={onNext}>
        {label}
      </button>
    </div>
  );
}

function InstallHint() {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  return (
    <details className="install">
      <summary>Ponla en la pantalla de inicio del móvil</summary>
      {ios ? (
        <p>En Safari, toca el botón Compartir (el cuadrado con la flecha hacia arriba) y elige «Añadir a pantalla de inicio».</p>
      ) : (
        <p>En Chrome, abre el menú (los tres puntos) y elige «Añadir a pantalla de inicio» o «Instalar aplicación».</p>
      )}
      <p>Así se abrirá como una app y te podremos avisar de tus sesiones.</p>
    </details>
  );
}

function ClinicMark() {
  return (
    <svg width="64" height="64" viewBox="0 0 44 44">
      <rect width="44" height="44" rx="12" fill="var(--ink)" />
      <rect x="9" y="27" width="5" height="8" rx="2" fill="var(--rpe-2)" />
      <rect x="16.5" y="21" width="5" height="14" rx="2" fill="var(--rpe-4)" />
      <rect x="24" y="15" width="5" height="20" rx="2" fill="var(--rpe-6)" />
      <rect x="31.5" y="9" width="5" height="26" rx="2" fill="var(--rpe-8)" />
    </svg>
  );
}
