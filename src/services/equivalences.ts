import { EXCHANGE_GROUPS } from '../data/foods';
import type { AppData, Food } from '../types';
import { getFood } from './catalog';

export interface Equivalence {
  food: Food;
  amount: number;
  basisLabel: string;
}

const BASIS_LABEL = { carbs: 'mismos hidratos', protein: 'misma proteína', fat: 'misma grasa', kcal: 'mismas calorías' } as const;

/**
 * Equivalencias de intercambio calculadas con la base de alimentos: cantidad del
 * alimento alternativo que aporta lo mismo del macronutriente dominante del grupo.
 */
export function equivalencesFor(data: AppData, foodId: string, amount: number): { group: string; items: Equivalence[] } | null {
  const group = EXCHANGE_GROUPS.find((g) => g.foods.includes(foodId));
  const base = getFood(data, foodId);
  if (!group || !base) return null;
  const target = base.per100[group.basis] * (amount / 100);
  if (target <= 0) return null;
  const items: Equivalence[] = [];
  for (const id of group.foods) {
    if (id === foodId) continue;
    const f = getFood(data, id);
    if (!f || f.per100[group.basis] <= 0) continue;
    const amt = (target / f.per100[group.basis]) * 100;
    if (amt > 600) continue;
    items.push({ food: f, amount: Math.round(amt / 5) * 5 || 5, basisLabel: BASIS_LABEL[group.basis] });
  }
  return { group: group.label, items };
}
