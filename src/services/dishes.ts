import type { AppData, DishIngredient, Food, ISODate, Macros, MealSlot, NutritionSnapshot, QtyUnit, Recipe, UserDishData } from '../types';
import { finalize } from '../data/recipeLibrary/build';
import { uid } from '../lib/format';
import { getFood, getRecipe } from './catalog';
import { addMacros, foodMacros, ingredientsNutrition, mealIngredients, scaleMacros, ZERO } from './nutrition';
import { ingredientsFiber, nutritionQuality, type DataQuality } from './recipeMeta';

/**
 * «Mis platos»: platos creados por el usuario.
 *
 * Se guardan en AppData.customRecipes como `Recipe` con `custom: true`, así el resto de la app
 * (ficha de receta, plan, lista de la compra, registro) los trata igual que a la biblioteca.
 * `dish.items` conserva exactamente lo que escribió el usuario (cantidad y unidad del plato
 * completo) y `ingredients` es la cantidad POR RACIÓN en g/ml, derivada de ello.
 *
 * Todo el cálculo nutricional pasa por `foodMacros` (services/nutrition.ts): una sola fórmula
 * para toda la app (valor por 100 g/ml × cantidad / 100).
 */

export const UNIT_LABEL: Record<QtyUnit, { short: string; long: string }> = {
  g: { short: 'g', long: 'gramos' },
  kg: { short: 'kg', long: 'kilogramos' },
  ml: { short: 'ml', long: 'mililitros' },
  l: { short: 'l', long: 'litros' },
  unidad: { short: 'ud.', long: 'unidades' },
  cucharada: { short: 'cda.', long: 'cucharadas' },
  cucharadita: { short: 'cdta.', long: 'cucharaditas' },
};
export const UNIT_ORDER: QtyUnit[] = ['g', 'kg', 'ml', 'l', 'unidad', 'cucharada', 'cucharadita'];

/** Volumen estándar de cuchara (ml). */
const SPOON_ML = { cucharada: 15, cucharadita: 5 } as const;

/** Ración típica del alimento en piezas: «1 unidad (M)» = 55 g → 55 g por unidad. */
function portionPer(food: Food, nouns: RegExp): number | null {
  const p = food.portion;
  const m = p?.label.match(/^(\d+)(?:\/(\d+))?\s+(.+)$/);
  if (!p || !m || !nouns.test(m[3]) || p.amount <= 0) return null;
  const pieces = Number(m[1]) / (m[2] ? Number(m[2]) : 1);
  return pieces > 0 ? p.amount / pieces : null;
}

/** Gramos (o ml) de una unidad del alimento, si la base de alimentos lo define. */
export function unitSize(food: Food): number | null {
  return portionPer(food, /^(unidad|unidades|mediano|mediana|pequeño|pequeña|grande)\b/i);
}

/**
 * Pasa una cantidad a la unidad base del alimento (g o ml). Devuelve null si no hay una
 * conversión fiable: nunca se convierten mililitros en gramos (ni al revés) sin densidad.
 */
export function toBaseAmount(food: Food, quantity: number, unit: QtyUnit): number | null {
  if (!(quantity > 0)) return null;
  switch (unit) {
    case 'g':
      return food.unit === 'g' ? quantity : null;
    case 'kg':
      return food.unit === 'g' ? quantity * 1000 : null;
    case 'ml':
      return food.unit === 'ml' ? quantity : null;
    case 'l':
      return food.unit === 'ml' ? quantity * 1000 : null;
    case 'unidad': {
      const u = unitSize(food);
      return u ? quantity * u : null;
    }
    case 'cucharada':
    case 'cucharadita': {
      if (food.unit === 'ml') return quantity * SPOON_ML[unit];
      // en sólidos solo si la base define el peso de una cucharada o cucharadita de ESE alimento
      const tbsp = portionPer(food, /^cucharadas?\b/i);
      const tsp = portionPer(food, /^cucharaditas?\b/i);
      const perTbsp = tbsp ?? (tsp ? tsp * 3 : null);
      if (!perTbsp) return null;
      return quantity * (unit === 'cucharada' ? perTbsp : perTbsp / 3);
    }
  }
}

/** Unidades que se pueden usar con este alimento (las que tienen conversión fiable). */
export function allowedUnits(food: Food): QtyUnit[] {
  return UNIT_ORDER.filter((u) => toBaseAmount(food, 1, u) !== null);
}

/** Cantidad inicial razonable al añadir un alimento: su ración típica. */
export function defaultQuantity(food: Food): { quantity: number; unit: QtyUnit } {
  const u = unitSize(food);
  if (u && food.portion && /^1\s/.test(food.portion.label)) return { quantity: 1, unit: 'unidad' };
  return { quantity: food.portion?.amount ?? 100, unit: food.unit };
}

export interface DishRow {
  item: DishIngredient;
  food: Food | undefined;
  /** cantidad en g/ml del alimento (null si no se puede calcular) */
  base: number | null;
  macros: Macros | null;
  fiber: number | null;
}

export interface DishNutrition {
  rows: DishRow[];
  total: Macros;
  perServing: Macros;
  fiberTotal: number;
  fiberPerServing: number;
  /** false si algún ingrediente no tiene dato de fibra */
  fiberComplete: boolean;
  /** ingredientes que no se han podido sumar (sin datos, cantidad no válida o unidad sin conversión) */
  missing: DishRow[];
  quality: DataQuality;
  servings: number;
}

/** Cálculo nutricional de un plato del usuario (plato completo y por ración). */
export function dishNutrition(data: Pick<AppData, 'customFoods'>, items: DishIngredient[], servings: number): DishNutrition {
  const s = servings > 0 ? servings : 1;
  let total = ZERO;
  let fiberTotal = 0;
  let fiberComplete = true;
  const rows: DishRow[] = items.map((item) => {
    const food = getFood(data, item.foodId);
    const base = food ? toBaseAmount(food, item.quantity, item.unit) : null;
    const macros = food && base !== null ? foodMacros(food, base) : null;
    const fiber = food && base !== null && food.fiber !== undefined ? (food.fiber * base) / 100 : null;
    if (macros) total = addMacros(total, macros);
    if (fiber !== null) fiberTotal += fiber;
    else fiberComplete = false;
    return { item, food, base, macros, fiber };
  });
  const missing = rows.filter((r) => !r.macros);
  const quality: DataQuality = missing.length ? 'pendiente' : nutritionQuality(data, items);
  return { rows, total, perServing: scaleMacros(total, 1 / s), fiberTotal, fiberPerServing: fiberTotal / s, fiberComplete, missing, quality, servings: s };
}

export const DISH_CATEGORIES: { value: UserDishData['category']; label: string; slots: MealSlot[] }[] = [
  { value: 'desayuno', label: 'Desayuno', slots: ['desayuno'] },
  { value: 'comida', label: 'Comida', slots: ['comida', 'cena'] },
  { value: 'cena', label: 'Cena', slots: ['cena', 'comida'] },
  { value: 'merienda', label: 'Merienda', slots: ['merienda', 'mediamanana'] },
  { value: 'snack', label: 'Snack', slots: ['mediamanana', 'merienda'] },
  { value: 'postre', label: 'Postre', slots: ['merienda', 'comida', 'cena'] },
];

export interface DishDraft {
  id?: string;
  name: string;
  description: string;
  category: UserDishData['category'];
  servings: number;
  minutes: number | null;
  steps: string;
  imageUrl?: string;
  items: DishIngredient[];
}

export function emptyDraft(): DishDraft {
  return { name: '', description: '', category: 'comida', servings: 1, minutes: null, steps: '', items: [] };
}

export function draftFromRecipe(r: Recipe): DishDraft {
  return {
    id: r.id,
    name: r.title ?? r.name,
    description: r.description ?? '',
    category: r.dish?.category ?? 'comida',
    servings: r.servings,
    minutes: r.minutes || null,
    steps: r.steps.join('\n'),
    imageUrl: r.imageUrl,
    // recetas de la biblioteca: cantidades por ración × raciones, en la unidad del alimento (g o ml)
    items: (r.dish?.items ?? r.ingredients.map((i) => ({ foodId: i.foodId, quantity: Math.round(i.amount * r.servings * 10) / 10, unit: (getFood({ customFoods: [] }, i.foodId)?.unit ?? 'g') as QtyUnit }))).map((i) => ({ ...i })),
  };
}

/** Errores que impiden guardar (vacío = se puede guardar). */
export function validateDraft(data: Pick<AppData, 'customFoods'>, d: DishDraft): string[] {
  const e: string[] = [];
  if (d.name.trim().length < 2) e.push('Escribe un nombre para el plato.');
  if (!d.items.length) e.push('Añade al menos un ingrediente.');
  if (!(d.servings >= 1 && d.servings <= 50)) e.push('Las raciones deben estar entre 1 y 50.');
  const n = dishNutrition(data, d.items, d.servings);
  if (d.items.length && n.missing.length === d.items.length) e.push('Ningún ingrediente tiene una cantidad válida.');
  return e;
}

/** Convierte el borrador en una receta del usuario (cantidades por ración en g/ml). */
export function buildDishRecipe(data: AppData, d: DishDraft, existing?: Recipe): Recipe {
  const now = new Date().toISOString();
  const n = dishNutrition(data, d.items, d.servings);
  const perServing = new Map<string, number>();
  for (const r of n.rows) if (r.base !== null) perServing.set(r.item.foodId, (perServing.get(r.item.foodId) ?? 0) + r.base / n.servings);
  const cat = DISH_CATEGORIES.find((c) => c.value === d.category)!;
  const name = d.name.trim().slice(0, 80);
  const recipe = finalize({
    id: d.id ?? uid('dish'),
    title: name,
    name,
    description: d.description.trim() || undefined,
    category: d.category,
    slots: cat.slots,
    servings: n.servings,
    minutes: d.minutes && d.minutes > 0 ? Math.round(d.minutes) : 0,
    ingredients: [...perServing].map(([foodId, amount]) => ({ foodId, amount: Math.round(amount * 10) / 10 })),
    steps: d.steps.split('\n').map((x) => x.trim()).filter(Boolean),
    tags: d.minutes && d.minutes <= 15 ? ['rapida'] : [],
    imageUrl: d.imageUrl,
    custom: true,
    dish: {
      items: d.items.map((i) => ({ ...i })),
      ownerId: data.profile.id,
      createdAt: existing?.dish?.createdAt ?? now,
      updatedAt: now,
      category: d.category,
    },
  });
  return recipe;
}

export function userDishes(data: Pick<AppData, 'customRecipes'>): Recipe[] {
  return data.customRecipes.filter((r) => r.custom).sort((a, b) => (b.dish?.updatedAt ?? '').localeCompare(a.dish?.updatedAt ?? ''));
}

/** Copia de los valores de UNA ración de una receta (con las sustituciones de esa comida si se indica). */
export function snapshotOf(data: AppData, recipe: Recipe, ingredients = recipe.ingredients): NutritionSnapshot {
  const n = ingredientsNutrition(data, ingredients);
  return {
    name: recipe.title ?? recipe.name,
    perServing: n.macros,
    fiber: ingredientsFiber(data, ingredients).grams,
    complete: n.missing.length === 0,
    at: new Date().toISOString(),
  };
}

/**
 * Antes de editar o borrar un plato: congela sus usos pasados o ya hechos en el plan, para que
 * lo que el usuario comió no cambie. Los registros de Hoy ya guardan su copia al registrarse.
 * Si se borra, también se congelan los usos futuros (pasan a mostrarse con su nombre).
 */
export function freezeDishUses(data: AppData, recipeId: string, today: ISODate, deleting = false): number {
  const recipe = getRecipe(data, recipeId);
  if (!recipe) return 0;
  let n = 0;
  for (const week of Object.values(data.plan)) {
    for (const m of week) {
      if (m.recipeId !== recipeId || m.snapshot) continue;
      if (!deleting && m.status !== 'hecha' && m.date >= today) continue;
      m.snapshot = snapshotOf(data, recipe, mealIngredients(data, m));
      if (deleting) m.customName = m.snapshot.name;
      n++;
    }
  }
  return n;
}

/** Guarda (crea o actualiza) un plato. Al actualizar, el historial anterior se conserva. */
export function saveDish(data: AppData, draft: DishDraft, today: ISODate): Recipe {
  const existing = draft.id ? data.customRecipes.find((r) => r.id === draft.id) : undefined;
  if (existing) freezeDishUses(data, existing.id, today);
  const recipe = buildDishRecipe(data, draft, existing);
  if (existing) data.customRecipes = data.customRecipes.map((r) => (r.id === recipe.id ? recipe : r));
  else data.customRecipes.push(recipe);
  return recipe;
}

/** Copia independiente de un plato (nuevo id; el original no cambia). */
export function duplicateDish(data: AppData, id: string): Recipe | null {
  const src = data.customRecipes.find((r) => r.id === id);
  if (!src) return null;
  const draft = draftFromRecipe(src);
  delete draft.id;
  draft.name = `${draft.name} (copia)`.slice(0, 80);
  const copy = buildDishRecipe(data, draft);
  data.customRecipes.push(copy);
  return copy;
}

/** Elimina un plato de «Mis platos». Los consumos y menús que lo usaban conservan sus valores. */
export function deleteDish(data: AppData, id: string, today: ISODate): void {
  freezeDishUses(data, id, today, true);
  data.customRecipes = data.customRecipes.filter((r) => r.id !== id);
  data.favorites.recipes = data.favorites.recipes.filter((x) => x !== id);
}

/** Entrada de registro para un plato: guarda una copia de sus valores por ración. */
export function dishLogEntry(data: AppData, recipe: Recipe, p: { date: ISODate; slot: MealSlot; servings: number }) {
  return {
    date: p.date,
    slot: p.slot,
    foodId: '',
    amount: p.servings,
    method: 'plato' as const,
    recipeId: recipe.id,
    snapshot: snapshotOf(data, recipe),
  };
}

/** Valores de un registro de plato (raciones × copia guardada). */
export function loggedDishMacros(entry: { amount: number; snapshot?: NutritionSnapshot }): Macros | null {
  return entry.snapshot ? scaleMacros(entry.snapshot.perServing, entry.amount) : null;
}

/** Redimensiona una foto a JPEG ligero (lado mayor 640 px) para guardarla con los datos. */
export async function compressPhoto(file: File, max = 640, quality = 0.72): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('No se ha podido leer la imagen.'));
      i.src = url;
    });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * k);
    canvas.height = Math.round(img.height * k);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('No se ha podido procesar la imagen.');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}
