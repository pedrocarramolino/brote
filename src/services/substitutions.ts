import type { AppData, Macros, PlannedMeal, Recipe } from '../types';
import { startOfWeek } from '../lib/dates';
import { allRecipes, getRecipe } from './catalog';
import { mealIngredients, recipeFit, recipeNutrition, ingredientsNutrition } from './nutrition';

export interface Alternative {
  recipe: Recipe;
  macros: Macros;
  score: number;
  reasons: string[];
  /** diferencias respecto al plato original */
  delta: Macros | null;
}

export interface AlternativesResult {
  alternatives: Alternative[];
  excludedCount: number;
  original: { recipe: Recipe | undefined; macros: Macros | null };
}

/**
 * Propone alternativas para un plato del plan respetando, por orden:
 * alergias e incompatibilidades (filtro duro), tipo de comida, tiempo disponible,
 * cercanía nutricional al original, ingredientes ya presentes en la semana y objetivo.
 */
export function findAlternatives(data: AppData, meal: PlannedMeal, limit = 8): AlternativesResult {
  const original = getRecipe(data, meal.recipeId);
  const origMacros = original && !original.custom ? ingredientsNutrition(data, mealIngredients(data, meal), meal.portion).macros : null;
  const profile = data.profile;

  // ingredientes ya presentes en el menú de la semana (disponibilidad)
  const weekKey = startOfWeek(meal.date);
  const weekFoods = new Set<string>();
  for (const m of data.plan[weekKey] ?? []) {
    if (m.id === meal.id) continue;
    mealIngredients(data, m).forEach((i) => weekFoods.add(i.foodId));
  }

  let excludedCount = 0;
  const alternatives: Alternative[] = [];

  for (const r of allRecipes(data)) {
    if (r.custom || r.id === meal.recipeId || !r.slots.includes(meal.slot)) continue;
    const fit = recipeFit(data, r, profile);
    if (!fit.ok) {
      excludedCount++;
      continue;
    }
    const macros = recipeNutrition(data, r, meal.portion).macros;
    const reasons: string[] = [];
    let score = 100;

    let delta: Macros | null = null;
    if (origMacros) {
      delta = {
        kcal: macros.kcal - origMacros.kcal,
        protein: macros.protein - origMacros.protein,
        carbs: macros.carbs - origMacros.carbs,
        fat: macros.fat - origMacros.fat,
      };
      const kcalPct = origMacros.kcal > 0 ? Math.abs(delta.kcal) / origMacros.kcal : 0;
      score -= kcalPct * 60;
      score -= Math.min(Math.abs(delta.protein), 30) * 0.8;
      if (kcalPct <= 0.12) reasons.push('Calorías similares');
      if (delta.protein >= 5) reasons.push(`Más proteína (+${Math.round(delta.protein)} g)`);
    }

    if (profile.cookingTime) {
      if (r.minutes <= profile.cookingTime) {
        if (r.minutes <= 15) reasons.push(`Lista en ${r.minutes} min`);
      } else {
        score -= 25;
        reasons.push(`Requiere ${r.minutes} min`);
      }
    } else if (r.minutes <= 10) {
      reasons.push(`Lista en ${r.minutes} min`);
    }

    const shared = r.ingredients.filter((i) => weekFoods.has(i.foodId)).length;
    const sharedRatio = shared / r.ingredients.length;
    score += sharedRatio * 20;
    if (sharedRatio >= 0.6) reasons.push('Usa ingredientes de tu semana');

    if (data.favorites.recipes.includes(r.id)) {
      score += 12;
      reasons.unshift('Favorita');
    }
    if ((profile.goal === 'ganar' || profile.goal === 'rendimiento') && r.tags.includes('alta_proteina')) score += 6;
    if (profile.goal === 'perder' && r.tags.includes('ligera')) score += 6;

    alternatives.push({ recipe: r, macros, score, reasons, delta });
  }

  alternatives.sort((a, b) => b.score - a.score);
  return { alternatives: alternatives.slice(0, limit), excludedCount, original: { recipe: original, macros: origMacros } };
}
