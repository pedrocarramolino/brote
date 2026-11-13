import type { AppData, Food, Macros } from '../types';
import { BASE_FOODS, FOOD_DB_VERSION, GENERIC_ALIAS, LEGACY_PER100, OFFICIAL_FOODS } from '../data/foods';
import { getFood, getRecipe } from './catalog';
import { addMacros, mealIngredients, scaleMacros, ZERO } from './nutrition';
import { FoodIndex } from './foodSearch';

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
  const version = d.foodDbVersion ?? 1;
  if (version >= FOOD_DB_VERSION) return;
  if (version < 2) freezeLegacyValues(d, today);
  if (version < 3) removeBrands(d, today);
  d.foodDbVersion = FOOD_DB_VERSION;
}

/** v1 → v2: congela el historial con los valores que usaba la app antes de BEDCA/USDA. */
function freezeLegacyValues(d: AppData, today: string): void {
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
}

/** Producto de marca guardado con una versión anterior (Open Food Facts). */
export const isBranded = (f: Food) => !!f.brand || f.source === 'openfoodfacts';

/**
 * Genérico equivalente a un producto de marca: el primero que da el buscador con el nombre del
 * producto, la misma unidad y valores parecidos (energía ±20 % o 15 kcal, proteína ±25 % o 2 g).
 * Si no hay ninguno fiable, devuelve undefined y el producto se conserva como alimento propio.
 */
export function genericFor(food: Food, index: FoodIndex): Food | undefined {
  const name = food.brand ? food.name.replace(new RegExp(food.brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), ' ') : food.name;
  const near = (a: number, b: number, rel: number, abs: number) => Math.abs(a - b) <= Math.max(abs, rel * Math.max(a, b));
  return index
    .search(name.replace(/\s+/g, ' ').trim(), { limit: 12 })
    .find((g) => g.unit === food.unit && near(g.per100.kcal, food.per100.kcal, 0.2, 15) && near(g.per100.protein, food.per100.protein, 0.25, 2));
}

/**
 * v2 → v3: Brote deja de usar marcas comerciales.
 * 1. Congela lo ya comido y lo planificado en días pasados con los valores con que se anotó.
 * 2. Sustituye cada producto de marca guardado por su genérico equivalente en platos, registros,
 *    favoritos, ajustes de ingredientes y lista de la compra. Si no hay equivalente fiable, el
 *    producto se queda como alimento propio sin marca (no se pierde ningún valor).
 * 3. Las entradas duplicadas del catálogo (GENERIC_ALIAS) pasan a su genérico.
 */
function removeBrands(d: AppData, today: string): void {
  for (const l of d.log) {
    if (l.snapshot || l.per100 || !l.foodId) continue;
    const p = getFood(d, l.foodId)?.per100;
    if (p) l.per100 = { ...p };
  }
  for (const week of Object.values(d.plan)) {
    for (const m of week) {
      if (m.snapshot || !m.recipeId || m.free || (m.status !== 'hecha' && m.date >= today)) continue;
      const r = getRecipe(d, m.recipeId);
      if (!r) continue;
      let perServing: Macros = ZERO;
      for (const i of mealIngredients(d, m)) {
        const p = getFood(d, i.foodId)?.per100;
        if (p) perServing = addMacros(perServing, scaleMacros(p, i.amount / 100));
      }
      m.snapshot = { name: r.title ?? r.name, perServing, complete: true, at: new Date().toISOString() };
    }
  }

  const remap: Record<string, string> = { ...GENERIC_ALIAS };
  const index = new FoodIndex();
  index.add(BASE_FOODS, 6);
  index.add(OFFICIAL_FOODS, 4);
  d.customFoods = (d.customFoods ?? []).flatMap((f) => {
    if (!isBranded(f)) return [f];
    const g = genericFor(f, index);
    if (g) {
      remap[f.id] = g.id;
      return [];
    }
    const own: Food = { ...f, source: 'usuario' };
    delete own.brand;
    delete (own as { quantity?: string }).quantity;
    delete own.ref;
    return [own];
  });

  const to = (id: string) => remap[id] ?? id;
  for (const r of d.customRecipes ?? []) {
    for (const i of r.ingredients) i.foodId = to(i.foodId);
    for (const i of r.dish?.items ?? []) i.foodId = to(i.foodId);
  }
  for (const l of d.log) if (l.foodId) l.foodId = to(l.foodId);
  d.favorites.foods = [...new Set(d.favorites.foods.map(to))];
  for (const week of Object.values(d.plan)) {
    for (const m of week) {
      if (!m.swaps) continue;
      m.swaps = Object.fromEntries(Object.entries(m.swaps).map(([k, v]) => [to(k), { ...v, foodId: to(v.foodId) }]));
    }
  }
  const rekey = <T,>(o: Record<string, T>) => Object.fromEntries(Object.entries(o).map(([k, v]) => [to(k), v]));
  for (const s of Object.values(d.shopping ?? {})) {
    s.checked = rekey(s.checked ?? {});
    s.qty = rekey(s.qty ?? {});
    s.removed = rekey(s.removed ?? {});
  }
  delete (d.profile as { useOpenFoodFacts?: boolean }).useOpenFoodFacts;
}
