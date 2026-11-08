import { EXCHANGE_GROUPS } from '../data/foods';
import type { AppData, Food } from '../types';
import { getFood } from './catalog';
import { foodAllowedByDiet, foodDisliked } from './nutrition';

export interface Equivalence {
  food: Food;
  amount: number;
  basisLabel: string;
  /** motivo por el que no se puede usar con el perfil actual (alergia, dieta, no le gusta) */
  blocked?: string;
}

const BASIS_LABEL = { carbs: 'mismos hidratos', protein: 'misma proteína', fat: 'misma grasa', kcal: 'mismas calorías' } as const;

/**
 * Equivalencias de intercambio calculadas con la base de alimentos: cantidad del
 * alimento alternativo que aporta lo mismo del macronutriente dominante del grupo.
 * `exclude` evita proponer alimentos que ya están en la misma comida (no se duplican).
 */
export function equivalencesFor(
  data: AppData,
  foodId: string,
  amount: number,
  opts: { exclude?: Set<string> } = {},
): { group: string; items: Equivalence[] } | null {
  const group = EXCHANGE_GROUPS.find((g) => g.foods.includes(foodId));
  const base = getFood(data, foodId);
  if (!group || !base) return null;
  const target = base.per100[group.basis] * (amount / 100);
  if (target <= 0) return null;
  const p = data.profile;
  const items: Equivalence[] = [];
  for (const id of group.foods) {
    if (id === foodId || opts.exclude?.has(id)) continue;
    const f = getFood(data, id);
    if (!f || f.per100[group.basis] <= 0) continue;
    const amt = (target / f.per100[group.basis]) * 100;
    if (amt > 600) continue;
    let blocked: string | undefined;
    const allergen = f.allergens?.find((a) => p.allergies.includes(a));
    if (allergen) blocked = 'Alérgeno';
    else if (!foodAllowedByDiet(f, p.dietType)) blocked = 'No encaja con tu dieta';
    else if (foodDisliked(f, p.dislikes)) blocked = 'No te gusta';
    items.push({ food: f, amount: Math.max(5, Math.round(amt / 5) * 5), basisLabel: BASIS_LABEL[group.basis], blocked });
  }
  // primero las utilizables
  items.sort((a, b) => Number(!!a.blocked) - Number(!!b.blocked));
  return { group: group.label, items };
}
