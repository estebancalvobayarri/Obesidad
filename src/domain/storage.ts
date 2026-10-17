import type { Rpe, RpeRange } from './rpe';
import type { RpeEntry, Adjustment } from './session';

/**
 * Almacenamiento local provisional. En el piloto real los datos irán a Supabase;
 * mientras tanto se guardan solo en este navegador.
 */

export type IntensityFeeling = 'tooHigh' | 'right' | 'tooLow';

export interface SessionRecord {
  id: string;
  date: string; // ISO
  protocol: 'aerobic';
  week: number;
  phaseId: string;
  plannedMinutes: number;
  doneMinutes: number;
  mainTarget: RpeRange;
  sessionRpe: Rpe;
  feeling: IntensityFeeling;
  load: number;
  rpeLog: RpeEntry[];
  adjustments: Adjustment[];
}

export interface StoredData {
  version: 1;
  /** Ajuste personal («de ahora en adelante») en puntos de RPE. */
  personalOffset: number;
  week: number;
  history: SessionRecord[];
}

const KEY = 'pauta.v1';

export const EMPTY_DATA: StoredData = { version: 1, personalOffset: 0, week: 1, history: [] };

export function loadData(): StoredData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY_DATA;
    const parsed = JSON.parse(raw) as Partial<StoredData>;
    if (parsed.version !== 1) return EMPTY_DATA;
    return { ...EMPTY_DATA, ...parsed, history: parsed.history ?? [] };
  } catch {
    return EMPTY_DATA;
  }
}

export function saveData(data: StoredData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Sin almacenamiento disponible (modo privado): la app sigue funcionando sin guardar.
  }
}
