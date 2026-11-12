const nf0 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });

/** Formato español con separador de miles también en números de 4 cifras (2.000). */
export const n0 = (v: number) => {
  const r = Math.round(v);
  return Math.abs(r) >= 1000 && Math.abs(r) < 10000 ? r.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') : nf0.format(r);
};
export const n1 = (v: number) => nf1.format(v);
export const kcal = (v: number) => `${n0(v)} kcal`;
export const grams = (v: number) => `${n0(v)} g`;

export const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Convierte texto con coma decimal a número. Devuelve NaN si no es válido. */
export function parseDecimal(s: string): number {
  if (typeof s !== 'string') return NaN;
  const t = s.trim().replace(/\s/g, '').replace(',', '.');
  if (!t || !/^-?\d*(\.\d+)?$/.test(t)) return NaN;
  return Number(t);
}

export const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** «1 ración», «½ ración», «1,5 raciones» */
export function servingsLabel(n: number): string {
  if (n === 0.5) return '½ ración';
  const t = String(Math.round(n * 100) / 100).replace('.', ',');
  return `${t} ${n === 1 ? 'ración' : 'raciones'}`;
}
