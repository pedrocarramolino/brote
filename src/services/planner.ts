import type { AppData, ISODate, MealSlot, PlannedMeal, Recipe } from '../types';
import { daysBetween, weekDates } from '../lib/dates';
import { uid } from '../lib/format';
import { ALL_SLOTS, allRecipes } from './catalog';
import { recipeFit } from './nutrition';

const EPOCH_MONDAY = '2024-01-01';

/** Recetas candidatas para un tipo de comida según el perfil (dieta, alergias, tiempo). */
export function candidatesFor(data: AppData, slot: MealSlot): Recipe[] {
  const fit = allRecipes(data).filter((r) => !r.custom && r.slots.includes(slot) && recipeFit(data, r, data.profile).ok);
  const maxMin = data.profile.cookingTime;
  if (!maxMin) return fit;
  const timed = fit.filter((r) => r.minutes <= maxMin);
  return timed.length >= 3 ? timed : fit;
}

/**
 * Genera el menú de una semana de forma determinista (misma semana → mismo menú)
 * rotando las recetas compatibles para que no se repitan en días consecutivos.
 */
export function generateWeek(data: AppData, monday: ISODate): PlannedMeal[] {
  const week = Math.floor(daysBetween(EPOCH_MONDAY, monday) / 7);
  const out: PlannedMeal[] = [];
  const slots = ALL_SLOTS.filter((s) => data.profile.mealSlots.includes(s));
  weekDates(monday).forEach((date, dayIdx) => {
    slots.forEach((slot, slotIdx) => {
      const c = candidatesFor(data, slot);
      if (!c.length) return;
      const step = c.length > 7 ? 3 : 1;
      const idx = (dayIdx * step + week * 5 + slotIdx * 2) % c.length;
      // evita repetir el mismo plato principal en comida y cena del mismo día
      let recipe = c[idx];
      if (slot === 'cena') {
        const lunch = out.find((m) => m.date === date && m.slot === 'comida');
        if (lunch && lunch.recipeId === recipe.id) recipe = c[(idx + 1) % c.length];
      }
      out.push({ id: uid('pm'), date, slot, recipeId: recipe.id, portion: 1, status: 'pendiente' });
    });
  });
  return out;
}

/**
 * Vuelve a generar los platos PENDIENTES desde `fromDate` en adelante (semanas ya creadas),
 * respetando las preferencias actuales. Lo hecho u omitido no se toca.
 */
export function regenerateFrom(data: AppData, fromDate: ISODate): void {
  for (const monday of Object.keys(data.plan)) {
    if (monday < startOfWeekLocal(fromDate)) continue;
    const fresh = generateWeek(data, monday);
    const kept = data.plan[monday].filter((m) => m.date < fromDate || m.status !== 'pendiente');
    const keptKeys = new Set(kept.map((m) => `${m.date}|${m.slot}`));
    data.plan[monday] = [...kept, ...fresh.filter((m) => m.date >= fromDate && !keptKeys.has(`${m.date}|${m.slot}`))];
  }
}

function startOfWeekLocal(d: ISODate): ISODate {
  const dt = new Date(`${d}T12:00:00`);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
