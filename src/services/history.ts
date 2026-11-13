import type { AppData, Macros } from '../types';
import { FOOD_DB_VERSION, LEGACY_PER100 } from '../data/foods';
import { getFood, getRecipe } from './catalog';
import { addMacros, mealIngredients, scaleMacros, ZERO } from './nutrition';

/**
 * Historial coherente cuando cambia la base de alimentos.
 *
 * Criterio: las recetas de la biblioteca y los platos del usuario usan siempre los valores
 * vigentes de cada alimento (si se corrige un alimento, sus recetas se recalculan), pero lo que
 * el usuario ya comió no cambia: cada registro guarda una copia de los valores con los que se anotó.
 *
 * Esta migración se aplica una vez a los datos guardados con una versión anterior de la base:
 * congela con los valores ANTERIORES los registros de Hoy y las comidas ya hechas o pasadas.
 */
export function migrateFoodDb(d: AppData, today: string): void {
  if ((d.foodDbVersion ?? 1) >= FOOD_DB_VERSION) return;
  const oldPer100 = (foodId: string): Macros | undefined => LEGACY_PER100[foodId] ?? getFood(d, foodId)?.per100;

  // registros de alimentos de Hoy
  for (const l of d.log) {
    if (l.snapshot || l.per100 || !l.foodId) continue;
    const p = oldPer100(l.foodId);
    if (p) l.per100 = { ...p };
  }

  // comidas del plan ya hechas o de días pasados
  for (const week of Object.values(d.plan)) {
    for (const m of week) {
      if (m.snapshot || !m.recipeId || (m.status !== 'hecha' && m.date >= today)) continue;
      const r = getRecipe(d, m.recipeId);
      if (!r) continue;
      let perServing: Macros = ZERO;
      for (const i of mealIngredients(d, m)) {
        const p = oldPer100(i.foodId);
        if (p) perServing = addMacros(perServing, scaleMacros(p, i.amount / 100));
      }
      m.snapshot = { name: r.title ?? r.name, perServing, complete: true, at: new Date().toISOString() };
    }
  }
  d.foodDbVersion = FOOD_DB_VERSION;
}
