import { recipeTitle } from './recipeMeta';
import type { AppData, ISODate, MealSlot, PlannedMeal, UserProfile } from '../types';
import { addDays, startOfWeek, weekDates } from '../lib/dates';
import { uid } from '../lib/format';
import { ALL_SLOTS, getFood, getRecipe } from './catalog';
import { conflictingFoods, mealIngredients, plannedMealsFor } from './nutrition';
import { equivalencesFor } from './equivalences';
import { findAlternatives } from './substitutions';
import { generateWeek } from './planner';
import { mealAdherence, trackingStart } from './habits';

/** ¿Toca la revisión de la semana? Pendiente hasta que el usuario la confirme. */
export function reviewDue(data: AppData, today: ISODate): boolean {
  if (!data.onboarded) return false;
  const monday = startOfWeek(today);
  const st = data.weeklyReview;
  if (st?.lastCompleted && st.lastCompleted >= monday) return false;
  // la primera semana de uso no necesita revisión
  if (trackingStart(data) >= monday) return false;
  if (st?.postponedUntil && st.postponedUntil > today) return false;
  return true;
}

export interface LastWeekRecap {
  monday: ISODate;
  mealsDone: number;
  mealsTotal: number;
  sessions: number;
  avgSteps: number | null;
  lastWeight: { kg: number; date: ISODate } | null;
}

/** Resumen de la semana anterior (solo días desde que empezó a usar la app). */
export function lastWeekRecap(data: AppData, today: ISODate): LastWeekRecap {
  const monday = addDays(startOfWeek(today), -7);
  const start = trackingStart(data);
  const days = weekDates(monday).filter((d) => d >= start && d < today);
  let done = 0;
  let total = 0;
  for (const d of days) {
    const a = mealAdherence(data, d);
    if (a === null) continue;
    const meals = plannedMealsFor(data, d).filter((m) => data.profile.mealSlots.includes(m.slot));
    total += meals.length;
    done += meals.filter((m) => m.status === 'hecha').length;
  }
  const inWeek = (d: string) => d >= monday && d < addDays(monday, 7);
  const steps = data.steps.filter((s) => inWeek(s.date));
  const w = data.weights.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
  return {
    monday,
    mealsDone: done,
    mealsTotal: total,
    sessions: data.sessions.filter((s) => inWeek(s.date)).length,
    avgSteps: steps.length ? Math.round(steps.reduce((a, s) => a + s.steps, 0) / steps.length) : null,
    lastWeight: w ? { kg: w.kg, date: w.date } : null,
  };
}

/* ------------------------------ Propuestas de menú ------------------------------ */

export type MenuDecision =
  | { kind: 'keep' }
  | { kind: 'ingredients'; swaps: Record<string, { foodId: string; amount: number }>; label: string }
  | { kind: 'recipe'; recipeId: string; label: string }
  | { kind: 'remove' };

export interface MealReviewItem {
  meal: PlannedMeal;
  /** motivos de conflicto con las preferencias nuevas (vacío = sin conflicto) */
  conflicts: string[];
  /** opciones propuestas, la primera es la recomendada */
  options: MenuDecision[];
}

/** Comidas pendientes desde hoy hasta el domingo, en las comidas del día activas. */
export function upcomingMeals(data: AppData, today: ISODate, slots: MealSlot[]): PlannedMeal[] {
  const monday = startOfWeek(today);
  return (data.plan[monday] ?? [])
    .filter((m) => m.date >= today && m.status === 'pendiente' && slots.includes(m.slot))
    .sort((a, b) => a.date.localeCompare(b.date) || ALL_SLOTS.indexOf(a.slot) - ALL_SLOTS.indexOf(b.slot));
}

/**
 * Para cada comida próxima, comprueba si encaja con el perfil propuesto y genera opciones:
 * 1) cambiar solo los ingredientes en conflicto por una equivalencia permitida;
 * 2) cambiar el plato por una alternativa compatible;
 * 3) quitar la comida. "Mantener" siempre está disponible.
 */
export function reviewMenu(data: AppData, draft: UserProfile, today: ISODate): MealReviewItem[] {
  const d: AppData = { ...data, profile: draft };
  return upcomingMeals(data, today, draft.mealSlots).map((meal) => {
    const recipe = getRecipe(d, meal.recipeId);
    const options: MenuDecision[] = [];
    let conflicts: string[] = [];
    if (recipe && !recipe.custom) {
      const ings = mealIngredients(d, meal, { includeRemoved: true });
      const active = ings.filter((i) => !i.removed);
      const bad = conflictingFoods(d, active, draft);
      conflicts = bad.map((b) => `${getFood(d, b.foodId)?.name ?? b.foodId}: ${b.reason}`);
      if (bad.length) {
        // 1) sustitución de ingredientes
        const swaps: Record<string, { foodId: string; amount: number }> = { ...(meal.swaps ?? {}) };
        const used = new Set(active.map((i) => i.foodId));
        const parts: string[] = [];
        let ok = true;
        for (const b of bad) {
          const row = ings.find((i) => i.foodId === b.foodId && !i.removed)!;
          const key = row.replaces ?? row.foodId;
          const eq = equivalencesFor(d, row.foodId, row.amount, { exclude: used });
          const pick = eq?.items.find((e) => !e.blocked);
          if (!pick) {
            ok = false;
            break;
          }
          used.add(pick.food.id);
          swaps[key] = { foodId: pick.food.id, amount: pick.amount };
          parts.push(`${getFood(d, row.foodId)?.name ?? row.foodId} → ${pick.food.name.toLowerCase()}`);
        }
        if (ok) options.push({ kind: 'ingredients', swaps, label: parts.join(', ') });
        // 2) cambio de plato
        for (const alt of findAlternatives(d, meal, 3).alternatives) options.push({ kind: 'recipe', recipeId: alt.recipe.id, label: recipeTitle(alt.recipe) });
        options.push({ kind: 'remove' }, { kind: 'keep' });
      }
    }
    if (!options.length) {
      options.push({ kind: 'keep' });
      if (recipe && !recipe.custom) for (const alt of findAlternatives(d, meal, 3).alternatives) options.push({ kind: 'recipe', recipeId: alt.recipe.id, label: recipeTitle(alt.recipe) });
      options.push({ kind: 'remove' });
    }
    return { meal, conflicts, options };
  });
}

/** Huecos (día, comida) vacíos desde hoy hasta el domingo que se pueden rellenar con el perfil propuesto. */
export function proposedAdditions(data: AppData, draft: UserProfile, today: ISODate): PlannedMeal[] {
  const monday = startOfWeek(today);
  const d: AppData = { ...data, profile: draft };
  const existing = new Set((data.plan[monday] ?? []).filter((m) => draft.mealSlots.includes(m.slot)).map((m) => `${m.date}|${m.slot}`));
  return generateWeek(d, monday)
    .filter((m) => m.date >= today && !existing.has(`${m.date}|${m.slot}`))
    .map((m) => ({ ...m, id: uid('pm') }));
}

export function decisionKey(dec: MenuDecision): string {
  return dec.kind === 'recipe' ? `recipe:${dec.recipeId}` : dec.kind;
}

/** Aplica las decisiones del menú sobre el borrador de datos (dentro de un mutate). */
export function applyMenuDecisions(d: AppData, decisions: Record<string, MenuDecision>, additions: PlannedMeal[]): void {
  for (const week of Object.keys(d.plan)) {
    d.plan[week] = d.plan[week].flatMap((m) => {
      const dec = decisions[m.id];
      if (!dec || dec.kind === 'keep' || m.status !== 'pendiente') return [m];
      if (dec.kind === 'remove') return [];
      if (dec.kind === 'ingredients') return [{ ...m, swaps: { ...dec.swaps } }];
      const { swaps: _drop, ...rest } = m;
      return [{ ...rest, recipeId: dec.recipeId, customName: undefined }];
    });
  }
  for (const a of additions) {
    const key = startOfWeek(a.date);
    d.plan[key] ??= [];
    if (!d.plan[key].some((m) => m.date === a.date && m.slot === a.slot)) d.plan[key].push(a);
  }
}
