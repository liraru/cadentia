import { WeightRecord } from './models';

/** Registros de más antiguo a más reciente (desempata por record_id). */
export function sortAsc(records: WeightRecord[]): WeightRecord[] {
  return [...records].sort((a, b) => a.date.localeCompare(b.date) || a.record_id - b.record_id);
}

/**
 * Progreso hacia el objetivo, entre 0 y 1.
 * Funciona tanto si el objetivo es bajar como si es subir de peso.
 */
export function goalProgress(start: number, current: number, target: number): number {
  const total = start - target;
  if (total === 0) return current === target ? 1 : 0;
  return Math.min(1, Math.max(0, (start - current) / total));
}
