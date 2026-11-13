import { BASE_FOODS, GENERIC_ALIAS, OFFICIAL_FOODS } from '../data/foods';
import { RECIPE_LIBRARY as BASE_RECIPES } from '../data/recipeLibrary';
import type { AppData, Food, MealSlot, Recipe } from '../types';

export const SLOT_META: Record<MealSlot, { label: string; short: string; time: string }> = {
  desayuno: { label: 'Desayuno', short: 'Desayuno', time: '08:00' },
  mediamanana: { label: 'Media mañana', short: 'Media mañana', time: '11:00' },
  comida: { label: 'Comida', short: 'Comida', time: '14:00' },
  merienda: { label: 'Merienda', short: 'Merienda', time: '17:30' },
  cena: { label: 'Cena', short: 'Cena', time: '21:00' },
};

export const ALL_SLOTS: MealSlot[] = ['desayuno', 'mediamanana', 'comida', 'merienda', 'cena'];

const baseFoodMap = new Map([...BASE_FOODS, ...OFFICIAL_FOODS].map((f) => [f.id, f]));
const baseRecipeMap = new Map(BASE_RECIPES.map((r) => [r.id, r]));

export function getFood(data: Pick<AppData, 'customFoods'>, id: string): Food | undefined {
  return baseFoodMap.get(GENERIC_ALIAS[id] ?? id) ?? data.customFoods.find((f) => f.id === id);
}

/** Alimentos de la app, catálogo genérico (BEDCA/USDA) y alimentos propios del usuario. */
export function allFoods(data: Pick<AppData, 'customFoods'>): Food[] {
  return [...BASE_FOODS, ...OFFICIAL_FOODS, ...data.customFoods];
}

export function getRecipe(data: Pick<AppData, 'customRecipes'>, id: string | null | undefined): Recipe | undefined {
  if (!id) return undefined;
  return baseRecipeMap.get(id) ?? data.customRecipes.find((r) => r.id === id);
}

export function allRecipes(data: Pick<AppData, 'customRecipes'>): Recipe[] {
  return [...BASE_RECIPES, ...data.customRecipes];
}

export function slotsOrdered(slots: MealSlot[]): MealSlot[] {
  return ALL_SLOTS.filter((s) => slots.includes(s));
}
