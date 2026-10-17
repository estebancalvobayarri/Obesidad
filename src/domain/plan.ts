import type { RpeRange } from './rpe';

/**
 * Plan del piloto (9 meses, unas 39 semanas): fases iniciales 1-4 y bloques rotatorios 1-2.
 * Valores tomados del plan de negocio, con la intensidad traducida a RPE.
 * Pendiente de Alberto: ajustar la adaptación (semana 1 con sesiones de 20-30 minutos).
 */
export interface Phase {
  id: string;
  name: string;
  firstWeek: number;
  lastWeek: number;
  /** Días por semana propuestos; si hay uno por semana de la fase, se indexa por semana. */
  proposedDays: number | readonly number[];
  proposedMinutes: number;
  /** Zona objetivo de la parte principal. */
  target: RpeRange;
  /** Límites de seguridad: ningún ajuste puede salirse de aquí. */
  limits: RpeRange;
}

export const PILOT_PHASES: readonly Phase[] = [
  { id: 'f1', name: 'Fase 1: Adaptación', firstWeek: 1, lastWeek: 4, proposedDays: [3, 4, 5, 6], proposedMinutes: 45, target: [4, 4], limits: [2, 5] },
  { id: 'f2', name: 'Fase 2: Continuación I', firstWeek: 5, lastWeek: 8, proposedDays: 6, proposedMinutes: 55, target: [5, 5], limits: [2, 6] },
  { id: 'f3', name: 'Fase 3: Continuación II', firstWeek: 9, lastWeek: 14, proposedDays: 6, proposedMinutes: 50, target: [6, 6], limits: [2, 7] },
  { id: 'f4', name: 'Fase 4: Continuación III', firstWeek: 15, lastWeek: 24, proposedDays: 6, proposedMinutes: 65, target: [6, 6], limits: [2, 7] },
  { id: 'b1', name: 'Bloque rotatorio 1', firstWeek: 25, lastWeek: 32, proposedDays: 6, proposedMinutes: 50, target: [6, 7], limits: [2, 7] },
  { id: 'b2', name: 'Bloque rotatorio 2', firstWeek: 33, lastWeek: 40, proposedDays: 6, proposedMinutes: 65, target: [6, 7], limits: [2, 7] },
];

export const PILOT_LAST_WEEK = PILOT_PHASES[PILOT_PHASES.length - 1].lastWeek;

export function phaseForWeek(week: number): Phase {
  const w = Math.min(Math.max(1, Math.floor(week)), PILOT_LAST_WEEK);
  return PILOT_PHASES.find((p) => w >= p.firstWeek && w <= p.lastWeek) ?? PILOT_PHASES[0];
}

export function proposedDaysForWeek(week: number): number {
  const phase = phaseForWeek(week);
  if (typeof phase.proposedDays === 'number') return phase.proposedDays;
  const index = Math.min(Math.max(0, Math.floor(week) - phase.firstWeek), phase.proposedDays.length - 1);
  return phase.proposedDays[index];
}

/** Duración de sesión que se puede elegir. */
export const MIN_SESSION_MINUTES = 10;
export const MAX_SESSION_MINUTES = 120;
