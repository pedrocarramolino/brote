import type { AppData, Cuisine, DietType, Difficulty, MainIngredient, Macros, Recipe, RecipeCategory, RecipeTag } from '../types';
import { getFood } from './catalog';
import { foodAllowedByDiet, ingredientsAllergens, recipeNutrition } from './nutrition';

export const CATEGORY_META: Record<RecipeCategory, { label: string; plural: string }> = {
  desayuno: { label: 'Desayuno', plural: 'Desayunos' },
  mediamanana: { label: 'Media mañana', plural: 'Media mañana' },
  comida: { label: 'Comida', plural: 'Comidas' },
  cena: { label: 'Cena', plural: 'Cenas' },
  merienda: { label: 'Merienda', plural: 'Meriendas' },
  snack: { label: 'Snack saludable', plural: 'Snacks' },
  postre: { label: 'Postre', plural: 'Postres' },
};
export const CATEGORY_ORDER: RecipeCategory[] = ['desayuno', 'mediamanana', 'comida', 'merienda', 'cena', 'snack', 'postre'];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { facil: 'Fácil', media: 'Media', elaborada: 'Elaborada' };

export const MAIN_LABEL: Record<MainIngredient, string> = {
  pollo: 'Pollo', pavo: 'Pavo', ternera: 'Ternera', cerdo: 'Cerdo', pescado_blanco: 'Pescado blanco', pescado_azul: 'Pescado azul',
  atun: 'Atún', marisco: 'Marisco', huevo: 'Huevo', lacteo: 'Lácteos', legumbre: 'Legumbres', proteina_vegetal: 'Proteína vegetal',
  cereal: 'Cereales', verdura: 'Verduras', fruta: 'Fruta',
};

export const TAG_LABEL: Record<RecipeTag, string> = {
  rapida: 'Rápida', batch: 'Se puede preparar antes', sin_coccion: 'Sin cocción', alta_proteina: 'Alta en proteína', ligera: 'Ligera',
  cuchara: 'De cuchara', horno: 'Al horno', dulce: 'Dulce', tradicional: 'Tradicional', internacional: 'Internacional',
};

export type DietLabel = 'vegana' | 'vegetariana' | 'pescetariana' | 'sin_gluten' | 'sin_lactosa';
export const DIET_LABEL: Record<DietLabel, string> = {
  vegana: 'Vegana', vegetariana: 'Vegetariana', pescetariana: 'Pescetariana', sin_gluten: 'Sin gluten', sin_lactosa: 'Sin lactosa',
};

/** Tipos de alimentación con los que es compatible la receta (deducido de sus ingredientes). */
export function dietLabels(data: Pick<AppData, 'customFoods'>, r: Recipe): DietLabel[] {
  const foods = r.ingredients.map((i) => getFood(data, i.foodId)).filter((f): f is NonNullable<typeof f> => !!f);
  const okFor = (d: DietType) => foods.every((f) => foodAllowedByDiet(f, d));
  const out: DietLabel[] = [];
  if (okFor('vegana')) out.push('vegana');
  else if (okFor('vegetariana')) out.push('vegetariana');
  else if (okFor('pescetariana')) out.push('pescetariana');
  const allergens = ingredientsAllergens(data, r.ingredients);
  if (!allergens.includes('gluten')) out.push('sin_gluten');
  if (!allergens.includes('lactosa')) out.push('sin_lactosa');
  return out;
}

export type DataQuality = 'verificado' | 'estimado' | 'pendiente';

/**
 * Calidad del dato nutricional de un conjunto de ingredientes:
 * - verificado: todos los alimentos tienen datos del envase (Open Food Facts);
 * - estimado: se calculan con valores medios de referencia o introducidos por el usuario;
 * - pendiente: falta algún alimento en la base y su aporte no se suma.
 */
export function nutritionQuality(data: Pick<AppData, 'customFoods'>, ingredients: { foodId: string }[]): DataQuality {
  let allLabel = ingredients.length > 0;
  for (const i of ingredients) {
    const f = getFood(data, i.foodId);
    if (!f) return 'pendiente';
    if (f.source !== 'openfoodfacts') allLabel = false;
  }
  return allLabel ? 'verificado' : 'estimado';
}

export const QUALITY_TEXT: Record<DataQuality, { label: string; detail: string }> = {
  verificado: { label: 'Dato verificado', detail: 'Calculado con los valores del envase de cada producto.' },
  estimado: {
    label: 'Valor estimado',
    detail: 'Calculado a partir de los ingredientes y sus cantidades con valores medios aproximados por 100 g. Pueden variar según marca, variedad y preparación.',
  },
  pendiente: { label: 'Datos pendientes', detail: 'Algún ingrediente no tiene datos en la base y no se ha sumado.' },
};

const macroCache = new WeakMap<Recipe, Macros>();
/** Valores por ración, cacheados (la biblioteca es estática). */
export function recipeMacros(data: Pick<AppData, 'customFoods'>, r: Recipe): Macros {
  if (r.custom) return recipeNutrition(data, r).macros;
  let m = macroCache.get(r);
  if (!m) macroCache.set(r, (m = recipeNutrition(data, r).macros));
  return m;
}

/** Nombre comercial de la receta (o el descriptivo si es una receta propia sin título). */
export const recipeTitle = (r: Pick<Recipe, 'title' | 'name'>) => r.title ?? r.name;

export const CUISINE_LABEL: Record<Cuisine, string> = {
  espanola: 'Española', mediterranea: 'Mediterránea', italiana: 'Italiana', mexicana: 'Mexicana', asiatica: 'Asiática', americana: 'Americana', internacional: 'Del mundo',
};
export const CUISINE_ORDER: Cuisine[] = ['espanola', 'mediterranea', 'italiana', 'mexicana', 'asiatica', 'americana', 'internacional'];

export interface FiberInfo {
  grams: number;
  /** false si algún ingrediente no tiene dato de fibra (el total es parcial) */
  complete: boolean;
}

/** Fibra estimada por ración (multiplicada por `portion`). */
export function ingredientsFiber(data: Pick<AppData, 'customFoods'>, ingredients: { foodId: string; amount: number }[], portion = 1): FiberInfo {
  let grams = 0;
  let complete = true;
  for (const i of ingredients) {
    const f = getFood(data, i.foodId);
    if (!f || f.fiber === undefined) { complete = false; continue; }
    grams += (f.fiber * i.amount * portion) / 100;
  }
  return { grams, complete };
}

/** Texto de búsqueda de una receta: nombre comercial, descripción e ingredientes. */
export function recipeMatches(data: Pick<AppData, 'customFoods'>, r: Recipe, normalizedQuery: string, norm: (s: string) => string): boolean {
  if (!normalizedQuery) return true;
  const words = normalizedQuery.split(/\s+/).filter(Boolean);
  const hay = `${norm(r.title ?? '')} ${norm(r.name)} ${r.ingredients.map((i) => norm(getFood(data, i.foodId)?.name ?? '')).join(' ')}`;
  return words.every((w) => hay.includes(w));
}

/** Línea secundaria de una receta: la descripción del plato (biblioteca) o la del usuario (Mis platos). */
export const recipeSubtitle = (r: Pick<Recipe, 'custom' | 'description' | 'title' | 'name'>): string | undefined =>
  r.custom ? r.description : r.title ? r.name : undefined;
