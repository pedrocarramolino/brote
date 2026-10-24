import type { AppData, ISODate } from '../../types';
import { addDays, startOfWeek, weekDates } from '../../lib/dates';
import { getRecipe, SLOT_META } from '../catalog';
import { dayTotals, plannedMealNutrition, plannedMealsFor, round } from '../nutrition';
import { buildShoppingList } from '../shopping';
import { dayHabits, mealAdherence, trackingStart } from '../habits';
import { ALLERGEN_LABELS } from '../../data/foods';

/**
 * Contexto que se envía al asistente. Solo incluye lo necesario para responder
 * sobre alimentación y organización; nunca peso, medidas ni identificadores.
 * Si el usuario no ha dado su consentimiento, se envía un contexto mínimo sin datos personales.
 */
export interface AssistantContext {
  shared: boolean;
  today: ISODate;
  profile?: {
    goal?: string;
    diet?: string;
    allergies: string[];
    dislikes: string[];
    cookingTimeMax?: number;
    mealSlots: string[];
  };
  targets?: { kcal?: number; protein?: number; carbs?: number; fat?: number; origin?: string };
  todayPlan?: { slot: string; dish: string; status: string; kcal?: number }[];
  tomorrowPlan?: { slot: string; dish: string; kcal?: number }[];
  todayConsumed?: { kcal: number; protein: number; carbs: number; fat: number };
  weekSummary?: { mealsDone: number; mealsPlanned: number; habitsPct: number; sessions: number };
  pendingShopping?: string[];
  purchased?: string[];
}

function dayPlan(data: AppData, date: ISODate) {
  return plannedMealsFor(data, date)
    .filter((m) => data.profile.mealSlots.includes(m.slot))
    .map((m) => {
      const r = getRecipe(data, m.recipeId);
      const n = plannedMealNutrition(data, m).macros;
      return { slot: SLOT_META[m.slot].label, dish: r?.name ?? m.customName ?? 'Sin plato', status: m.status, kcal: n ? Math.round(n.kcal) : undefined };
    });
}

export function buildAssistantContext(data: AppData, today: ISODate): AssistantContext {
  if (!data.profile.shareContextWithAI) return { shared: false, today };
  const p = data.profile;
  const monday = startOfWeek(today);
  const start = trackingStart(data);
  const days = weekDates(monday).filter((d) => d <= today && d >= start);
  let mealsDone = 0;
  let mealsPlanned = 0;
  let habitsSum = 0;
  for (const d of days) {
    const meals = plannedMealsFor(data, d).filter((m) => p.mealSlots.includes(m.slot));
    mealsPlanned += meals.length;
    mealsDone += meals.filter((m) => m.status === 'hecha').length;
    habitsSum += dayHabits(data, d).pct;
  }
  const shop = buildShoppingList(data, monday);
  const allItems = shop.groups.flatMap((g) => g.items);
  return {
    shared: true,
    today,
    profile: {
      goal: p.goal,
      diet: p.dietType,
      allergies: p.allergies.map((a) => ALLERGEN_LABELS[a]),
      dislikes: p.dislikes,
      cookingTimeMax: p.cookingTime,
      mealSlots: p.mealSlots.map((s) => SLOT_META[s].label),
    },
    targets: { ...p.targets },
    todayPlan: dayPlan(data, today),
    tomorrowPlan: dayPlan(data, addDays(today, 1)).map(({ status: _s, ...rest }) => rest),
    todayConsumed: round(dayTotals(data, today).consumed),
    weekSummary: {
      mealsDone,
      mealsPlanned,
      habitsPct: days.length ? Math.round(habitsSum / days.length) : 0,
      sessions: data.sessions.filter((s) => s.date >= monday && s.date <= today).length,
    },
    pendingShopping: allItems.filter((i) => !i.checked).map((i) => i.name).slice(0, 40),
    purchased: allItems.filter((i) => i.checked).map((i) => i.name).slice(0, 40),
  };
}

export { mealAdherence };
