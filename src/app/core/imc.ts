export interface ImcBand {
  label: string;
  color: string;
}

export function calcImc(weightKg: number, heightM: number): number {
  return Math.round((weightKg / (heightM * heightM)) * 100) / 100;
}

/** Escala OMS: un color por tramo (de azul/verde a rojo). */
export function imcBand(imc: number): ImcBand {
  if (imc < 18.5) return { label: 'Bajo peso', color: '#5BA8D6' };
  if (imc < 25)   return { label: 'Normal', color: '#4CBB7A' };
  if (imc < 30)   return { label: 'Sobrepeso', color: '#E3C94A' };
  if (imc < 35)   return { label: 'Obesidad I', color: '#F0A04B' };
  if (imc < 40)   return { label: 'Obesidad II', color: '#E8743B' };
  return { label: 'Obesidad III', color: '#D64545' };
}
