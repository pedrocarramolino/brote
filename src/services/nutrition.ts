import type { Allergen, AppData, DietType, Food, FoodLogEntry, ISODate, Macros, PlannedMeal, Recipe, UserProfile } from '../types';
import { getFood, getRecipe } from './catalog';

export const ZERO: Macros = { kcal: 0, protein: 0, carbs: 0, fat: 0 };

export const addMacros = (a: Macros, b: Macros): Macros => ({
  kcal: a.kcal + b.kcal,
  protein: a.protein + b.protein,
  carbs: a.carbs + b.carbs,
  fat: a.fat + b.fat,
});

export const scaleMacros = (m: Macros, k: number): Macros => ({
  kcal: m.kcal * k,
  protein: m.protein * k,
  carbs: m.carbs * k,
  fat: m.fat * k,
});

export function foodMacros(food: Food, amount: number): Macros {
  return scaleMacros(food.per100, amount / 100);
}

export interface RecipeNutrition {
  macros: Macros;
  /** ingredientes sin datos en la base (no se suman) */
  missing: string[];
}

/** Valores por ración de la receta, multiplicados por `portion`. */
export function recipeNutrition(data: Pick<AppData, 'customFoods'>, recipe: Recipe, portion = 1): RecipeNutrition {
  return ingredientsNutrition(data, recipe.ingredients, portion);
}

export interface EffectiveIngredient {
  foodId: string;
  amount: number; // por ración
  /** alimento original de la receta si este ingrediente es una sustitución */
  replaces?: string;
  /** el usuario lo ha quitado de esta comida (solo con includeRemoved) */
  removed?: boolean;
}

/**
 * Ingredientes reales de una comida del plan: los de la receta con las sustituciones
 * que el usuario haya hecho en ESA comida (meal.swaps). Única fuente para nutrición,
 * lista de la compra y vista de receta.
 */
export function mealIngredients(data: Pick<AppData, 'customRecipes'>, meal: PlannedMeal, opts: { includeRemoved?: boolean } = {}): EffectiveIngredient[] {
  const r = getRecipe(data, meal.recipeId);
  if (!r) return [];
  const rows = r.ingredients.map((i): EffectiveIngredient => {
    const s = meal.swaps?.[i.foodId];
    if (!s) return { foodId: i.foodId, amount: i.amount };
    // cantidad 0 = ingrediente quitado de esta comida
    if (s.amount <= 0) return { foodId: i.foodId, amount: i.amount, removed: true };
    return { foodId: s.foodId, amount: s.amount, replaces: i.foodId };
  });
  return opts.includeRemoved ? rows : rows.filter((x) => !x.removed);
}

/** Alimentos de una lista que no encajan con el perfil (alergia, dieta o no le gustan). */
export function conflictingFoods(data: Pick<AppData, 'customFoods'>, ingredients: { foodId: string }[], profile: UserProfile): { foodId: string; reason: string }[] {
  const out: { foodId: string; reason: string }[] = [];
  for (const ing of ingredients) {
    const f = getFood(data, ing.foodId);
    if (!f) continue;
    const allergen = f.allergens?.find((a) => profile.allergies.includes(a));
    if (allergen) out.push({ foodId: f.id, reason: 'alérgeno' });
    else if (!foodAllowedByDiet(f, profile.dietType)) out.push({ foodId: f.id, reason: 'no encaja con tu alimentación' });
    else if (foodDisliked(f, profile.dislikes)) out.push({ foodId: f.id, reason: 'no te gusta' });
  }
  return out;
}

export function ingredientsNutrition(data: Pick<AppData, 'customFoods'>, ingredients: { foodId: string; amount: number }[], portion = 1): RecipeNutrition {
  let m = ZERO;
  const missing: string[] = [];
  for (const ing of ingredients) {
    const f = getFood(data, ing.foodId);
    if (!f) {
      missing.push(ing.foodId);
      continue;
    }
    m = addMacros(m, foodMacros(f, ing.amount * portion));
  }
  return { macros: m, missing };
}

export function recipeAllergens(data: Pick<AppData, 'customFoods'>, recipe: Recipe): Allergen[] {
  const set = new Set<Allergen>();
  recipe.ingredients.forEach((i) => getFood(data, i.foodId)?.allergens?.forEach((a) => set.add(a)));
  return [...set];
}


const LEGUME_IDS = new Set(['garbanzos', 'lentejas', 'alubias', 'hummus', 'guisantes', 'edamame']);
const strip = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

/**
 * ¿Es un alimento que no le gusta al usuario? Compara con el nombre y, para términos
 * genéricos («pescado», «marisco», «legumbres», «carne», «lácteos»), con el grupo del alimento.
 */
export function foodDisliked(food: Food, dislikes: string[]): boolean {
  const name = strip(food.name);
  const tags = food.tags ?? [];
  for (const raw of dislikes) {
    const d = strip(raw);
    if (d.length < 3) continue;
    if (d === food.id || name.includes(d)) return true;
    const stem = d.replace(/s$/, '');
    if ((stem === 'pescado' || stem === 'pescados') && (food.allergens?.includes('pescado') || food.allergens?.includes('marisco'))) return true;
    if (stem === 'marisco' && food.allergens?.includes('marisco')) return true;
    if (stem.startsWith('legumbre') && LEGUME_IDS.has(food.id)) return true;
    if (stem === 'carne' && tags.includes('carne')) return true;
    if ((stem === 'lacteo' || stem === 'lacteos') && tags.includes('lacteo')) return true;
  }
  return false;
}

export function foodAllowedByDiet(food: Food, diet: DietType | undefined): boolean {
  const t = food.tags ?? [];
  switch (diet) {
    case 'vegana':
      return !t.includes('animal');
    case 'vegetariana':
      return !t.includes('carne') && !t.includes('pescado');
    case 'pescetariana':
      return !t.includes('carne');
    default:
      return true;
  }
}

export interface FitResult {
  ok: boolean;
  reasons: string[]; // motivos de incompatibilidad
}

/** Comprueba si una receta respeta dieta, alergias y alimentos que no gustan. */
export function recipeFit(data: Pick<AppData, 'customFoods'>, recipe: Recipe, profile: UserProfile): FitResult {
  const reasons: string[] = [];
  const allergens = recipeAllergens(data, recipe);
  const hit = allergens.filter((a) => profile.allergies.includes(a));
  if (hit.length) reasons.push(`Contiene ${hit.join(', ')}`);
  for (const ing of recipe.ingredients) {
    const f = getFood(data, ing.foodId);
    if (!f) continue;
    if (!foodAllowedByDiet(f, profile.dietType)) {
      reasons.push(`${f.name} no encaja con tu alimentación`);
      break;
    }
  }
  const disliked = recipe.ingredients
    .map((i) => getFood(data, i.foodId))
    .filter((f): f is Food => !!f && foodDisliked(f, profile.dislikes));
  if (disliked.length) reasons.push(`Lleva ${disliked.map((f) => f.name.toLowerCase()).join(', ')}`);
  return { ok: reasons.length === 0, reasons };
}

export interface MealNutrition {
  macros: Macros | null; // null = sin datos verificados
}

export function plannedMealNutrition(data: AppData, meal: PlannedMeal): MealNutrition {
  // comida libre: sin plato previsto (lo que se coma se registra con «Añadir alimento»)
  if (meal.free) return { macros: null };
  // valores congelados: el plato del usuario se editó o borró después de usarse
  if (meal.snapshot) return { macros: scaleMacros(meal.snapshot.perServing, meal.portion) };
  const r = getRecipe(data, meal.recipeId);
  if (!r) return { macros: null };
  return { macros: ingredientsNutrition(data, mealIngredients(data, meal), meal.portion).macros };
}

export function ingredientsAllergens(data: Pick<AppData, 'customFoods'>, ingredients: { foodId: string }[]): Allergen[] {
  const set = new Set<Allergen>();
  ingredients.forEach((i) => getFood(data, i.foodId)?.allergens?.forEach((a) => set.add(a)));
  return [...set];
}

export function plannedMealsFor(data: AppData, date: ISODate): PlannedMeal[] {
  const out: PlannedMeal[] = [];
  for (const week of Object.values(data.plan)) for (const m of week) if (m.date === date) out.push(m);
  return out;
}

export interface DayTotals {
  consumed: Macros;
  planned: Macros;
  /** platos marcados como hechos sin datos nutricionales verificados */
  unknownDone: number;
  doneMeals: number;
  totalMeals: number;
  logCount: number;
}

/** Totales del día: comidas del plan marcadas como hechas + registros manuales. */
export function dayTotals(data: AppData, date: ISODate): DayTotals {
  let consumed = ZERO;
  let planned = ZERO;
  let unknownDone = 0;
  let doneMeals = 0;
  const meals = plannedMealsFor(data, date).filter((m) => data.profile.mealSlots.includes(m.slot));
  for (const m of meals) {
    const n = plannedMealNutrition(data, m);
    if (n.macros) planned = addMacros(planned, n.macros);
    if (m.status === 'hecha') {
      doneMeals++;
      if (n.macros) consumed = addMacros(consumed, n.macros);
      else unknownDone++;
    }
  }
  const logs = data.log.filter((l) => l.date === date);
  for (const l of logs) consumed = addMacros(consumed, logEntryMacros(data, l) ?? ZERO);
  return { consumed, planned, unknownDone, doneMeals, totalMeals: meals.length, logCount: logs.length };
}

/**
 * Valores de un registro de Hoy: alimento × cantidad, o plato × raciones usando la copia
 * guardada al registrarlo (si luego se edita el plato, lo ya comido no cambia).
 */
export function logEntryMacros(data: Pick<AppData, 'customFoods'>, l: FoodLogEntry): Macros | null {
  if (l.snapshot) return scaleMacros(l.snapshot.perServing, l.amount);
  if (l.per100) return scaleMacros(l.per100, l.amount / 100);
  const f = getFood(data, l.foodId);
  return f ? foodMacros(f, l.amount) : null;
}

export const round = (m: Macros): Macros => ({
  kcal: Math.round(m.kcal),
  protein: Math.round(m.protein),
  carbs: Math.round(m.carbs),
  fat: Math.round(m.fat),
});

/** Referencia general de etiquetado UE (Reglamento 1169/2011, adulto medio). No es un objetivo personal. */
export const EU_REFERENCE_INTAKE = { kcal: 2000, protein: 50, carbs: 260, fat: 70 };
