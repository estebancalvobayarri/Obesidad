import { MAX_SESSION_MINUTES, MIN_SESSION_MINUTES, phaseForWeek, PILOT_LAST_WEEK, proposedDaysForWeek } from './plan';

/** Datos del alta del usuario. */

export type Sex = 'female' | 'male';
export type Protocol = 'strength' | 'aerobic';
export type PlanMode = 'recommended' | 'custom';

export interface Profile {
  clinicCode: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  /** Respuestas del cuestionario de cribado, en el orden de PARQ_QUESTIONS. */
  parq: boolean[];
  /** La consulta ha dado el visto bueno (solo hace falta si alguna respuesta es «sí»). */
  medicalClearance: boolean;
  protocol: Protocol;
  activity: string;
  planMode: PlanMode;
  /** Días de la semana elegidos: 0 = lunes … 6 = domingo. */
  weekdays: number[];
  minutes: number;
  /** Hora preferida «HH:MM», opcional. */
  time: string | null;
  /** Fecha de inicio del plan (ISO). La semana del plan se cuenta desde aquí. */
  startDate: string;
}

/* ---------- Datos físicos ---------- */

export const LIMITS = {
  age: { min: 18, max: 100 },
  heightCm: { min: 120, max: 220 },
  weightKg: { min: 40, max: 300 },
} as const;

export type BodyField = keyof typeof LIMITS;

export const BODY_FIELD_LABEL: Record<BodyField, string> = {
  age: 'la edad',
  heightCm: 'la altura',
  weightKg: 'el peso',
};

/** Devuelve el mensaje de error de un campo, o null si es válido. */
export function validateBodyField(field: BodyField, value: number | null): string | null {
  const { min, max } = LIMITS[field];
  if (value === null || Number.isNaN(value)) return `Escribe ${BODY_FIELD_LABEL[field]}.`;
  if (value < min || value > max) return `Escribe un valor entre ${min} y ${max}.`;
  return null;
}

/** Acepta coma o punto decimal. */
export function parseNumber(text: string): number | null {
  const clean = text.trim().replace(',', '.');
  if (!clean) return null;
  const n = Number(clean);
  return Number.isFinite(n) ? n : null;
}

/* ---------- Cuestionario de cribado (PAR-Q+, preguntas generales) ---------- */

/**
 * Adaptación provisional de las 7 preguntas generales del PAR-Q+.
 * Pendiente: sustituir por la versión oficial en español y revisar sus condiciones de uso.
 */
export const PARQ_QUESTIONS: readonly { text: string; note?: string }[] = [
  { text: '¿Te ha dicho alguna vez un médico que tienes un problema de corazón o la tensión alta?' },
  { text: '¿Sientes dolor en el pecho en reposo, en tus actividades diarias o cuando haces actividad física?' },
  {
    text: '¿Has perdido el equilibrio por mareo o has perdido el conocimiento en los últimos 12 meses?',
    note: 'Responde «no» si el mareo fue por respirar muy deprisa, por ejemplo durante un ejercicio intenso.',
  },
  { text: '¿Te han diagnosticado alguna otra enfermedad crónica, aparte de las del corazón o la tensión alta?' },
  { text: '¿Tomas actualmente medicación recetada para alguna enfermedad crónica?' },
  {
    text: '¿Tienes, o has tenido en los últimos 12 meses, algún problema de huesos, articulaciones o músculos que pueda empeorar si haces más actividad física?',
  },
  { text: '¿Te ha dicho alguna vez un médico que solo debes hacer actividad física con supervisión médica?' },
];

export function needsMedicalClearance(parq: readonly boolean[]): boolean {
  return parq.some(Boolean);
}

/** Puede entrenar si respondió «no» a todo o si la consulta ya le ha dado el visto bueno. */
export function canTrain(profile: Pick<Profile, 'parq' | 'medicalClearance'>): boolean {
  return !needsMedicalClearance(profile.parq) || profile.medicalClearance;
}

/* ---------- Preferencias ---------- */

export const WEEKDAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const;
export const WEEKDAY_LONG = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'] as const;

export const AEROBIC_ACTIVITIES = ['Andar', 'Bicicleta estática', 'Elíptica', 'Cinta', 'Nadar', 'Bailar', 'Otra'] as const;

/** Reparto de días por la semana, con descanso entre medias cuando se puede. */
const SPREAD: Record<number, number[]> = {
  1: [2],
  2: [1, 4],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 3, 4],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

export function defaultWeekdays(days: number): number[] {
  const n = Math.min(7, Math.max(1, Math.round(days)));
  return [...SPREAD[n]];
}

export function toggleWeekday(weekdays: readonly number[], day: number): number[] {
  const set = new Set(weekdays);
  if (set.has(day)) set.delete(day);
  else set.add(day);
  return [...set].sort((a, b) => a - b);
}

export function recommendedPlan(): Pick<Profile, 'weekdays' | 'minutes'> {
  return { weekdays: defaultWeekdays(proposedDaysForWeek(1)), minutes: phaseForWeek(1).proposedMinutes };
}

export function clampMinutes(minutes: number): number {
  return Math.min(MAX_SESSION_MINUTES, Math.max(MIN_SESSION_MINUTES, Math.round(minutes / 5) * 5));
}

/** Colores de las barras del plan de negocio. */
export type LevelTone = 'red' | 'yellow' | 'green' | 'silver' | 'gold';

export function daysLevel(days: number): LevelTone {
  if (days <= 1) return 'red';
  if (days === 2) return 'yellow';
  if (days <= 4) return 'green';
  if (days === 5) return 'silver';
  return 'gold';
}

export function minutesLevel(minutes: number): LevelTone {
  if (minutes < 20) return 'red';
  if (minutes < 30) return 'yellow';
  if (minutes < 40) return 'green';
  if (minutes < 60) return 'silver';
  return 'gold';
}

export const LEVEL_LABEL: Record<LevelTone, string> = {
  red: 'Poco',
  yellow: 'Algo corto',
  green: 'Bien',
  silver: 'Muy bien',
  gold: 'Excelente',
};

/* ---------- Semana del plan ---------- */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Semana del plan (1-40) contando desde la fecha de inicio. */
export function currentWeek(startDate: string, now: Date): number {
  // Días de calendario (no milisegundos), para que el cambio de hora no descuadre la cuenta.
  const start = new Date(startDate);
  const startDay = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((today - startDay) / DAY_MS);
  return Math.min(PILOT_LAST_WEEK, Math.max(1, Math.floor(days / 7) + 1));
}

/** Día de la semana con lunes = 0. */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}
