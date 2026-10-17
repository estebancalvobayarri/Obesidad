/**
 * Escala de esfuerzo percibido (RPE) de 0 a 10, adaptada de Borg CR-10.
 * Es la única forma de medir la intensidad en la app: no se usa frecuencia cardiaca.
 */

export type Rpe = number; // entero de 0 a 10

/** Rango de RPE [mínimo, máximo], ambos incluidos. */
export type RpeRange = readonly [number, number];

export interface RpeBand {
  from: Rpe;
  to: Rpe;
  label: string;
  talkTest: string;
}

export const RPE_BANDS: readonly RpeBand[] = [
  { from: 0, to: 0, label: 'Reposo', talkTest: 'Como sentado en el sofá' },
  { from: 1, to: 2, label: 'Muy suave', talkTest: 'Hablas y cantas sin problema' },
  { from: 3, to: 4, label: 'Suave', talkTest: 'Hablas con total comodidad' },
  { from: 5, to: 6, label: 'Moderado', talkTest: 'Puedes hablar, pero no cantar' },
  { from: 7, to: 8, label: 'Vigoroso', talkTest: 'Solo frases cortas' },
  { from: 9, to: 10, label: 'Máximo', talkTest: 'No puedes hablar' },
];

export const RPE_MIN = 0;
export const RPE_MAX = 10;

export function bandFor(rpe: Rpe): RpeBand {
  const value = clamp(Math.round(rpe), RPE_MIN, RPE_MAX);
  return RPE_BANDS.find((b) => value >= b.from && value <= b.to) ?? RPE_BANDS[0];
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Texto corto de un rango: «4» o «6 a 7». */
export function formatRange([min, max]: RpeRange): string {
  return min === max ? `${min}` : `${min} a ${max}`;
}

export type EffortFeedback = 'below' | 'within' | 'above';

/** Compara el esfuerzo que indica el usuario con la zona objetivo. */
export function compareToTarget(reported: Rpe, target: RpeRange): EffortFeedback {
  if (reported < target[0]) return 'below';
  if (reported > target[1]) return 'above';
  return 'within';
}

export const FEEDBACK_TEXT: Record<EffortFeedback, string> = {
  below: 'Puedes subir un poco el ritmo.',
  within: 'Vas bien. Mantén este ritmo.',
  above: 'Baja un poco el ritmo.',
};
