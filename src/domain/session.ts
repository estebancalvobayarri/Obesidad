import { phaseForWeek, type Phase } from './plan';
import { clamp, type Rpe, type RpeRange } from './rpe';

/**
 * Motor de la sesión guiada. Todo se calcula a partir de marcas de tiempo
 * (no de un contador), para que el tiempo no se descuadre si el navegador
 * frena los temporizadores con la pantalla apagada o la app en segundo plano.
 */

export type SegmentKind = 'warmup' | 'main' | 'cooldown';

export interface Segment {
  kind: SegmentKind;
  title: string;
  seconds: number;
  /** Zona base, antes de los ajustes del usuario. */
  baseTarget: RpeRange;
  /** Si los ajustes de intensidad del usuario se aplican a este bloque. */
  adjustable: boolean;
}

export interface SessionPlan {
  protocol: 'aerobic';
  week: number;
  phase: Phase;
  segments: Segment[];
  totalSeconds: number;
}

export const RPE_PROMPT_EVERY_SECONDS = 5 * 60;

const WARMUP_TARGET: RpeRange = [2, 3];
const COOLDOWN_TARGET: RpeRange = [1, 2];

/** Sesión aeróbica continua: calentamiento, parte principal y vuelta a la calma. */
export function buildAerobicSession(week: number, minutes: number): SessionPlan {
  const phase = phaseForWeek(week);
  const total = Math.max(10, Math.round(minutes));
  const edge = total >= 20 ? 5 : Math.max(2, Math.floor(total / 4));
  const main = total - 2 * edge;
  const segments: Segment[] = [
    { kind: 'warmup', title: 'Calentamiento', seconds: edge * 60, baseTarget: WARMUP_TARGET, adjustable: false },
    { kind: 'main', title: 'Parte principal', seconds: main * 60, baseTarget: phase.target, adjustable: true },
    { kind: 'cooldown', title: 'Vuelta a la calma', seconds: edge * 60, baseTarget: COOLDOWN_TARGET, adjustable: false },
  ];
  return { protocol: 'aerobic', week, phase, segments, totalSeconds: total * 60 };
}

export interface RpeEntry {
  atSecond: number;
  value: Rpe;
  target: RpeRange;
}

export interface Adjustment {
  atSecond: number;
  delta: number;
  scope: 'today' | 'fromNowOn';
}

export interface SessionState {
  plan: SessionPlan;
  /** Multiplicador de tiempo para pruebas (1 = tiempo real). */
  speed: number;
  startedAt: number;
  pausedAt: number | null;
  pausedMs: number;
  /** Ajuste (en puntos de RPE) sobre la zona base de la parte principal. */
  offset: number;
  promptsHandled: number;
  rpeLog: RpeEntry[];
  adjustments: Adjustment[];
  finishedAt: number | null;
}

export function startSession(plan: SessionPlan, now: number, personalOffset = 0, speed = 1): SessionState {
  return {
    plan,
    speed,
    startedAt: now,
    pausedAt: null,
    pausedMs: 0,
    offset: allowedOffset(plan.phase, personalOffset),
    promptsHandled: 0,
    rpeLog: [],
    adjustments: [],
    finishedAt: null,
  };
}

/** Segundos de sesión transcurridos (en tiempo de plan), sin contar las pausas. */
export function elapsedSeconds(s: SessionState, now: number): number {
  const end = s.finishedAt ?? s.pausedAt ?? now;
  const realMs = Math.max(0, end - s.startedAt - s.pausedMs);
  return Math.min(s.plan.totalSeconds, (realMs / 1000) * s.speed);
}

export interface Position {
  index: number;
  segment: Segment;
  secondsIntoSegment: number;
  secondsLeftInSegment: number;
  secondsLeftTotal: number;
  done: boolean;
}

export function positionAt(plan: SessionPlan, elapsed: number): Position {
  let start = 0;
  for (let i = 0; i < plan.segments.length; i++) {
    const seg = plan.segments[i];
    if (elapsed < start + seg.seconds) {
      return {
        index: i,
        segment: seg,
        secondsIntoSegment: elapsed - start,
        secondsLeftInSegment: start + seg.seconds - elapsed,
        secondsLeftTotal: plan.totalSeconds - elapsed,
        done: false,
      };
    }
    start += seg.seconds;
  }
  const last = plan.segments[plan.segments.length - 1];
  return { index: plan.segments.length - 1, segment: last, secondsIntoSegment: last.seconds, secondsLeftInSegment: 0, secondsLeftTotal: 0, done: true };
}

/** Desplaza un rango y lo mantiene dentro de los límites, sin deformarlo. */
export function shiftWithin(range: RpeRange, delta: number, limits: RpeRange): RpeRange {
  const width = range[1] - range[0];
  const low = clamp(range[0] + delta, limits[0], limits[1] - width);
  return [low, low + width];
}

/** Recorta un ajuste a lo que permiten los límites de la fase. */
export function allowedOffset(phase: Phase, offset: number): number {
  const shifted = shiftWithin(phase.target, offset, phase.limits);
  return shifted[0] - phase.target[0];
}

export function targetFor(s: SessionState, segment: Segment): RpeRange {
  if (!segment.adjustable) return segment.baseTarget;
  return shiftWithin(segment.baseTarget, s.offset, s.plan.phase.limits);
}

export function currentTarget(s: SessionState, now: number): RpeRange {
  return targetFor(s, positionAt(s.plan, elapsedSeconds(s, now)).segment);
}

/** Hay una pregunta de esfuerzo pendiente cada 5 minutos de sesión. */
export function isRpePromptDue(s: SessionState, now: number): boolean {
  if (s.finishedAt !== null) return false;
  const elapsed = elapsedSeconds(s, now);
  if (elapsed >= s.plan.totalSeconds) return false;
  return Math.floor(elapsed / RPE_PROMPT_EVERY_SECONDS) > s.promptsHandled;
}

export function answerRpePrompt(s: SessionState, now: number, value: Rpe): SessionState {
  const elapsed = elapsedSeconds(s, now);
  return {
    ...s,
    promptsHandled: Math.floor(elapsed / RPE_PROMPT_EVERY_SECONDS),
    rpeLog: [...s.rpeLog, { atSecond: Math.round(elapsed), value, target: currentTarget(s, now) }],
  };
}

export function skipRpePrompt(s: SessionState, now: number): SessionState {
  return { ...s, promptsHandled: Math.floor(elapsedSeconds(s, now) / RPE_PROMPT_EVERY_SECONDS) };
}

export function pause(s: SessionState, now: number): SessionState {
  return s.pausedAt === null && s.finishedAt === null ? { ...s, pausedAt: now } : s;
}

export function resume(s: SessionState, now: number): SessionState {
  return s.pausedAt === null ? s : { ...s, pausedAt: null, pausedMs: s.pausedMs + (now - s.pausedAt) };
}

export function adjustIntensity(s: SessionState, now: number, delta: number, scope: Adjustment['scope']): SessionState {
  const offset = allowedOffset(s.plan.phase, s.offset + delta);
  return {
    ...s,
    offset,
    adjustments: [...s.adjustments, { atSecond: Math.round(elapsedSeconds(s, now)), delta: offset - s.offset, scope }],
  };
}

/** Cuánto se puede subir o bajar desde la zona actual de la parte principal. */
export function adjustmentRoom(s: SessionState): { up: number; down: number } {
  const main = s.plan.segments.find((seg) => seg.adjustable);
  if (!main) return { up: 0, down: 0 };
  const [low, high] = targetFor(s, main);
  return { up: s.plan.phase.limits[1] - high, down: low - s.plan.phase.limits[0] };
}

export function finish(s: SessionState, now: number): SessionState {
  const resumed = resume(s, now);
  return resumed.finishedAt === null ? { ...resumed, finishedAt: now } : resumed;
}

/** Carga de la sesión (Foster et al., 2001): RPE de sesión × minutos. */
export function sessionLoad(sessionRpe: Rpe, minutes: number): number {
  return Math.round(sessionRpe * minutes);
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
