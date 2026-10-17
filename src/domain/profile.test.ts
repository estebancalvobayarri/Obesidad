import { describe, expect, it } from 'vitest';
import {
  canTrain,
  clampMinutes,
  currentWeek,
  daysLevel,
  defaultWeekdays,
  minutesLevel,
  needsMedicalClearance,
  parseNumber,
  PARQ_QUESTIONS,
  recommendedPlan,
  toggleWeekday,
  validateBodyField,
  weekdayIndex,
} from './profile';

describe('datos físicos', () => {
  it('acepta coma o punto decimal', () => {
    expect(parseNumber('92,5')).toBe(92.5);
    expect(parseNumber(' 170 ')).toBe(170);
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
  });

  it('valida los rangos', () => {
    expect(validateBodyField('age', 45)).toBeNull();
    expect(validateBodyField('age', 15)).toBe('Escribe un valor entre 18 y 100.');
    expect(validateBodyField('weightKg', null)).toBe('Escribe el peso.');
  });
});

describe('cribado', () => {
  it('tiene las 7 preguntas generales', () => {
    expect(PARQ_QUESTIONS).toHaveLength(7);
  });

  it('pide visto bueno si alguna respuesta es sí', () => {
    const allNo = Array(7).fill(false);
    expect(needsMedicalClearance(allNo)).toBe(false);
    expect(canTrain({ parq: allNo, medicalClearance: false })).toBe(true);
    const oneYes = [...allNo];
    oneYes[4] = true;
    expect(canTrain({ parq: oneYes, medicalClearance: false })).toBe(false);
    expect(canTrain({ parq: oneYes, medicalClearance: true })).toBe(true);
  });
});

describe('preferencias', () => {
  it('reparte los días con descanso entre medias', () => {
    expect(defaultWeekdays(3)).toEqual([0, 2, 4]);
    expect(defaultWeekdays(9)).toHaveLength(7);
  });

  it('activa y desactiva días', () => {
    expect(toggleWeekday([0, 2, 4], 2)).toEqual([0, 4]);
    expect(toggleWeekday([0, 4], 6)).toEqual([0, 4, 6]);
  });

  it('propone el plan de la semana 1', () => {
    expect(recommendedPlan()).toEqual({ weekdays: [0, 2, 4], minutes: 45 });
  });

  it('redondea los minutos a tramos de 5 dentro de 10-120', () => {
    expect(clampMinutes(33)).toBe(35);
    expect(clampMinutes(3)).toBe(10);
    expect(clampMinutes(200)).toBe(120);
  });

  it('colorea días y minutos como en el plan de negocio', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(daysLevel)).toEqual(['red', 'yellow', 'green', 'green', 'silver', 'gold', 'gold']);
    expect([10, 25, 35, 45, 60].map(minutesLevel)).toEqual(['red', 'yellow', 'green', 'silver', 'gold']);
  });
});

describe('semana del plan', () => {
  it('cuenta semanas desde el inicio', () => {
    const start = new Date(2026, 9, 19).toISOString(); // lunes 19 oct 2026
    expect(currentWeek(start, new Date(2026, 9, 19, 18))).toBe(1);
    expect(currentWeek(start, new Date(2026, 9, 25, 23))).toBe(1);
    expect(currentWeek(start, new Date(2026, 9, 26, 8))).toBe(2);
    expect(currentWeek(start, new Date(2028, 0, 1))).toBe(40);
  });

  it('numera los días con lunes = 0', () => {
    expect(weekdayIndex(new Date(2026, 9, 19))).toBe(0);
    expect(weekdayIndex(new Date(2026, 9, 25))).toBe(6);
  });
});
