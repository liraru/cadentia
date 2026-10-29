export interface ImcBand {
  label: string;
  color: string;
}

/** Tramo de la escala OMS: `min` es el IMC a partir del cual empieza (incluido). */
export interface ImcLevel extends ImcBand {
  min: number;
}

/** Escala OMS ordenada de menor a mayor IMC: un color por tramo (de azul/verde a rojo). */
export const IMC_LEVELS: ImcLevel[] = [
  { label: 'Bajo peso', color: '#5BA8D6', min: 0 },
  { label: 'Normal', color: '#4CBB7A', min: 18.5 },
  { label: 'Sobrepeso', color: '#E3C94A', min: 25 },
  { label: 'Obesidad I', color: '#F0A04B', min: 30 },
  { label: 'Obesidad II', color: '#E8743B', min: 35 },
  { label: 'Obesidad III', color: '#D64545', min: 40 },
];

export function calcImc(weightKg: number, heightM: number): number {
  return Math.round((weightKg / (heightM * heightM)) * 100) / 100;
}

/** Posición en IMC_LEVELS del tramo al que pertenece un IMC. */
export function imcLevelIndex(imc: number): number {
  let index = 0;
  IMC_LEVELS.forEach((level, i) => {
    if (imc >= level.min) index = i;
  });
  return index;
}

export function imcBand(imc: number): ImcBand {
  const { label, color } = IMC_LEVELS[imcLevelIndex(imc)];
  return { label, color };
}
