import { describe, expect, it } from 'vitest';
import { phaseForWeek, proposedDaysForWeek } from './plan';
import { bandFor, compareToTarget } from './rpe';
import {
  adjustIntensity,
  adjustmentRoom,
  answerRpePrompt,
  buildAerobicSession,
  currentTarget,
  elapsedSeconds,
  finish,
  isRpePromptDue,
  pause,
  positionAt,
  resume,
  sessionLoad,
  skipRpePrompt,
  startSession,
} from './session';

const MIN = 60_000;

describe('plan del piloto', () => {
  it('asigna la fase según la semana', () => {
    expect(phaseForWeek(1).id).toBe('f1');
    expect(phaseForWeek(8).id).toBe('f2');
    expect(phaseForWeek(24).id).toBe('f4');
    expect(phaseForWeek(25).id).toBe('b1');
    expect(phaseForWeek(39).id).toBe('b2');
    expect(phaseForWeek(99).id).toBe('b2');
  });

  it('propone de 3 a 6 días en la adaptación', () => {
    expect([1, 2, 3, 4].map(proposedDaysForWeek)).toEqual([3, 4, 5, 6]);
    expect(proposedDaysForWeek(10)).toBe(6);
  });
});

describe('escala RPE', () => {
  it('describe cada nivel', () => {
    expect(bandFor(4).label).toBe('Suave');
    expect(bandFor(6).talkTest).toBe('Puedes hablar, pero no cantar');
  });

  it('compara con la zona objetivo', () => {
    expect(compareToTarget(3, [4, 4])).toBe('below');
    expect(compareToTarget(6, [6, 7])).toBe('within');
    expect(compareToTarget(8, [6, 7])).toBe('above');
  });
});

describe('sesión aeróbica', () => {
  it('divide la sesión en calentamiento, principal y vuelta a la calma', () => {
    const plan = buildAerobicSession(1, 45);
    expect(plan.segments.map((s) => s.seconds / 60)).toEqual([5, 35, 5]);
    expect(plan.totalSeconds).toBe(45 * 60);
  });

  it('acorta calentamiento y vuelta a la calma en sesiones cortas', () => {
    const plan = buildAerobicSession(1, 10);
    expect(plan.segments.map((s) => s.seconds / 60)).toEqual([2, 6, 2]);
  });

  it('calcula el tiempo con marcas de tiempo y descuenta las pausas', () => {
    let s = startSession(buildAerobicSession(1, 45), 0);
    s = pause(s, 3 * MIN);
    expect(elapsedSeconds(s, 10 * MIN)).toBe(180);
    s = resume(s, 10 * MIN);
    expect(elapsedSeconds(s, 12 * MIN)).toBe(300);
    expect(positionAt(s.plan, 300).segment.kind).toBe('main');
  });

  it('pregunta el esfuerzo cada 5 minutos', () => {
    let s = startSession(buildAerobicSession(1, 45), 0);
    expect(isRpePromptDue(s, 4 * MIN)).toBe(false);
    expect(isRpePromptDue(s, 5 * MIN)).toBe(true);
    s = answerRpePrompt(s, 5 * MIN, 4);
    expect(isRpePromptDue(s, 9 * MIN)).toBe(false);
    expect(isRpePromptDue(s, 10 * MIN)).toBe(true);
    s = skipRpePrompt(s, 11 * MIN);
    expect(isRpePromptDue(s, 14 * MIN)).toBe(false);
    expect(s.rpeLog).toEqual([{ atSecond: 300, value: 4, target: [4, 4] }]);
  });

  it('no pregunta al terminar', () => {
    const s = startSession(buildAerobicSession(1, 10), 0);
    expect(isRpePromptDue(s, 10 * MIN)).toBe(false);
    expect(isRpePromptDue(finish(s, 6 * MIN), 6 * MIN)).toBe(false);
  });

  it('aplica el ajuste de intensidad solo a la parte principal y dentro de los límites', () => {
    let s = startSession(buildAerobicSession(1, 45), 0); // fase 1: objetivo 4, límites 2-5
    expect(currentTarget(s, 6 * MIN)).toEqual([4, 4]);
    s = adjustIntensity(s, 6 * MIN, 2, 'today');
    expect(currentTarget(s, 6 * MIN)).toEqual([5, 5]);
    expect(s.adjustments[0].delta).toBe(1);
    expect(currentTarget(s, 1 * MIN)).toEqual([2, 3]);
    s = adjustIntensity(s, 7 * MIN, -9, 'today');
    expect(currentTarget(s, 7 * MIN)).toEqual([2, 2]);
  });

  it('mantiene la anchura de una zona de dos puntos al ajustar', () => {
    let s = startSession(buildAerobicSession(26, 50), 0); // bloque 1: 6-7, límites 2-7
    expect(adjustmentRoom(s)).toEqual({ up: 0, down: 4 });
    s = adjustIntensity(s, 6 * MIN, -1, 'fromNowOn');
    expect(currentTarget(s, 6 * MIN)).toEqual([5, 6]);
  });

  it('respeta el ajuste personal guardado, recortado a la fase', () => {
    const s = startSession(buildAerobicSession(1, 45), 0, 3);
    expect(s.offset).toBe(1);
  });

  it('acelera el tiempo en modo prueba', () => {
    const s = startSession(buildAerobicSession(1, 45), 0, 0, 10);
    expect(elapsedSeconds(s, 30_000)).toBe(300);
  });

  it('calcula la carga de la sesión', () => {
    expect(sessionLoad(5, 45)).toBe(225);
  });
});
