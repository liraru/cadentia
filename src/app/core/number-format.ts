const cache = new Map<string, Intl.NumberFormat>();

/** Formatea un número con coma decimal (es-ES). */
export function fmtNum(value: number, min = 1, max = 2): string {
  const key = `${min}-${max}`;
  let formatter = cache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: min,
      maximumFractionDigits: max,
    });
    cache.set(key, formatter);
  }
  return formatter.format(value);
}
