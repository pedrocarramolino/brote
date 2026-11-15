import type { AppData, BurnGoal, ISODate } from '../types';

/**
 * Objetivo diario de calorías quemadas con actividad.
 *
 * Balance de un día:  gasto total = gasto sin ejercicio + calorías quemadas con actividad.
 * Para conseguir un déficit D comiendo la ingesta objetivo I:
 *     gasto sin ejercicio + quemadas − I = D   ⇒   quemadas = I + D − gasto sin ejercicio
 *
 * - I es el objetivo de energía que el usuario ya tiene en «Objetivos nutricionales» (no se toca).
 * - El gasto sin ejercicio se estima con la ecuación de Mifflin-St Jeor (metabolismo en reposo)
 *   × 1,2 (vida sedentaria, sin ejercicio). Es una estimación, y así se indica.
 * - Las calorías quemadas que se registran son SOLO las de actividad (lo que marca el reloj como
 *   «calorías activas» o una app de ejercicio), no el gasto total del día.
 * - El objetivo no se suma nunca a las calorías permitidas para comer.
 */

/** Factor de actividad para el gasto diario SIN ejercicio (vida sedentaria). */
export const SEDENTARY_FACTOR = 1.2;

export const BURN_LIMITS = {
  entry: [1, 5000] as const,
  manual: [50, 3000] as const,
  deficit: [0, 1000] as const,
  age: [18, 100] as const,
  heightCm: [120, 230] as const,
  weightKg: [30, 300] as const,
};

/** Metabolismo en reposo (Mifflin-St Jeor). Con «otro» se usa la media de ambas fórmulas. */
export function restingKcal(sex: NonNullable<BurnGoal['sex']>, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return base + (sex === 'hombre' ? 5 : sex === 'mujer' ? -161 : -78);
}

/** Último peso registrado (kg) hasta una fecha, si existe. */
export function latestWeightKg(data: Pick<AppData, 'weights'>, until?: ISODate): number | undefined {
  const list = data.weights.filter((w) => !until || w.date <= until).sort((a, b) => b.date.localeCompare(a.date));
  return list[0]?.kg;
}

/** Datos que faltan para poder calcular el objetivo (vacío = se puede calcular). */
export function missingForCalc(intakeKcal: number | undefined, g: Partial<BurnGoal>): string[] {
  const out: string[] = [];
  if (!intakeKcal) out.push('objetivo de energía (ingesta)');
  if (g.deficit === undefined) out.push('déficit diario');
  if (!g.sex) out.push('sexo');
  if (!g.age) out.push('edad');
  if (!g.heightCm) out.push('altura');
  if (!g.weightKg) out.push('peso');
  return out;
}

export interface BurnTargetInfo {
  /** objetivo en kcal (null si no hay objetivo o faltan datos) */
  kcal: number | null;
  mode?: BurnGoal['mode'];
  /** desglose del cálculo (modo calculado) */
  calc?: { intake: number; deficit: number; resting: number; baseline: number; raw: number };
  missing: string[];
}

/** Objetivo vigente. En modo calculado se recalcula si cambia el objetivo de ingesta. */
export function burnTarget(data: Pick<AppData, 'profile'>): BurnTargetInfo {
  const g = data.profile.burnGoal;
  if (!g) return { kcal: null, missing: [] };
  if (g.mode === 'manual') return { kcal: g.kcal && g.kcal > 0 ? g.kcal : null, mode: 'manual', missing: g.kcal ? [] : ['objetivo'] };
  const intake = data.profile.targets.kcal;
  const missing = missingForCalc(intake, g);
  if (missing.length) return { kcal: null, mode: 'calculado', missing };
  const resting = restingKcal(g.sex!, g.weightKg!, g.heightCm!, g.age!);
  const baseline = resting * SEDENTARY_FACTOR;
  const raw = intake! + g.deficit! - baseline;
  // redondeo a 10 kcal: no aporta nada más precisión que la de la estimación
  const kcal = Math.max(0, Math.round(raw / 10) * 10);
  return { kcal, mode: 'calculado', calc: { intake: intake!, deficit: g.deficit!, resting, baseline, raw }, missing: [] };
}

/** Calorías quemadas registradas en un día. */
export function burnedOn(data: Pick<AppData, 'burned'>, date: ISODate): number {
  return (data.burned ?? []).filter((b) => b.date === date).reduce((a, b) => a + b.kcal, 0);
}

/** Progreso del día frente al objetivo. */
export function burnProgress(data: Pick<AppData, 'burned' | 'profile'>, date: ISODate) {
  const target = burnTarget(data).kcal;
  const burned = burnedOn(data, date);
  return {
    burned,
    target,
    remaining: target !== null ? Math.max(0, target - burned) : null,
    percent: target ? Math.round((burned / target) * 100) : null,
  };
}
