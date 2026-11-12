import type { Difficulty, MainIngredient, MealSlot, Recipe, RecipeCategory, RecipeTag } from '../../types';
import { BASE_FOODS } from '../foods';
import { CUISINE_CODES, EXISTING_TITLES, type CuisineCode } from './titles';

/**
 * Biblioteca de recetas: datos separados de la interfaz y de los menús del usuario.
 * Cada archivo de categoría declara filas compactas que aquí se convierten en `Recipe`.
 * Las cantidades son SIEMPRE por ración; la nutrición NO se escribe a mano: se calcula
 * con los ingredientes y la base de alimentos (ver services/nutrition.ts).
 */

export type RecipeDraft = Omit<Recipe, 'category' | 'difficulty' | 'main' | 'hue' | 'icon'> &
  Partial<Pick<Recipe, 'category' | 'difficulty' | 'main' | 'hue' | 'icon'>>;

/**
 * [id, nombre, franjas, minutos, dificultad, raciones, etiquetas, ingredientes, pasos, principal?]
 * - franjas: 'des,mm,com,mer,cen'
 * - dificultad: 'f' fácil · 'm' media · 'e' elaborada
 * - ingredientes: 'foodId gramos, foodId gramos' (por ración)
 */
export type Row = [string, string, string, number, 'f' | 'm' | 'e', number, string, string, string[], MainIngredient?];

const SLOT_CODES: Record<string, MealSlot> = { des: 'desayuno', mm: 'mediamanana', com: 'comida', mer: 'merienda', cen: 'cena' };
const DIFF: Record<string, Difficulty> = { f: 'facil', m: 'media', e: 'elaborada' };

const foodIds = new Set(BASE_FOODS.map((f) => f.id));
const foodById = new Map(BASE_FOODS.map((f) => [f.id, f]));

/**
 * Fila de las recetas nuevas (v3), con nombre comercial y cocina:
 * [id, título comercial, nombre descriptivo, cocina, franjas, minutos, dificultad, raciones, etiquetas, ingredientes, pasos, principal?]
 */
export type TRow = [string, string, string, CuisineCode, string, number, 'f' | 'm' | 'e', number, string, string, string[], MainIngredient?];

export function titled(category: RecipeCategory, list: TRow[]): RecipeDraft[] {
  return list.map(([id, title, name, cuisine, ...rest]) => {
    const [d] = rows(category, [[id, name, ...rest] as Row]);
    if (!CUISINE_CODES[cuisine]) throw new Error(`Receta ${id}: cocina desconocida ${cuisine}`);
    return { ...d, title, cuisine: CUISINE_CODES[cuisine] };
  });
}

export function rows(category: RecipeCategory, list: Row[]): RecipeDraft[] {
  return list.map(([id, name, slots, minutes, dif, servings, tags, ings, steps, main]) => {
    const ingredients = ings.split(',').map((t) => {
      const [foodId, amount] = t.trim().split(/\s+/);
      if (!foodIds.has(foodId)) throw new Error(`Receta ${id}: alimento desconocido «${foodId}»`);
      const n = Number(amount);
      if (!(n > 0)) throw new Error(`Receta ${id}: cantidad no válida para ${foodId}`);
      return { foodId, amount: n };
    });
    return {
      id,
      name,
      category,
      slots: slots.split(',').map((c) => {
        const s = SLOT_CODES[c.trim()];
        if (!s) throw new Error(`Receta ${id}: franja desconocida ${c}`);
        return s;
      }),
      minutes,
      difficulty: DIFF[dif],
      servings,
      tags: (tags ? tags.split(/\s+/) : []) as RecipeTag[],
      ingredients,
      steps,
      main,
    };
  });
}

/* ---------- metadatos derivados ---------- */

const MAIN_OF: Record<string, MainIngredient> = {
  pollo: 'pollo', pollo_contramuslo: 'pollo', caldo_pollo: 'pollo',
  pavo: 'pavo', pavo_fiambre: 'pavo',
  ternera: 'ternera', ternera_picada: 'ternera',
  lomo_cerdo: 'cerdo', solomillo_cerdo: 'cerdo', jamon_serrano: 'cerdo', jamon_cocido: 'cerdo',
  merluza: 'pescado_blanco', bacalao: 'pescado_blanco', lubina: 'pescado_blanco', dorada: 'pescado_blanco', rape: 'pescado_blanco',
  salmon: 'pescado_azul', sardinas: 'pescado_azul', caballa: 'pescado_azul', salmon_ahumado: 'pescado_azul', boquerones: 'pescado_azul', trucha: 'pescado_azul', emperador: 'pescado_azul',
  pulpo: 'marisco', almejas: 'marisco', queso_untar: 'lacteo', harina_garbanzo: 'legumbre', habas: 'legumbre', tofu_sedoso: 'proteina_vegetal',
  atun: 'atun', atun_fresco: 'atun',
  langostinos: 'marisco', gambas: 'marisco', mejillones: 'marisco', calamar: 'marisco', sepia: 'marisco',
  huevo: 'huevo', claras: 'huevo',
  yogur: 'lacteo', yogur_griego: 'lacteo', queso_batido: 'lacteo', queso_fresco: 'lacteo', mozzarella: 'lacteo', requeson: 'lacteo',
  skyr: 'lacteo', kefir: 'lacteo', queso_curado: 'lacteo', queso_cabra: 'lacteo', feta: 'lacteo', leche: 'lacteo', queso_rallado: 'lacteo',
  garbanzos: 'legumbre', lentejas: 'legumbre', alubias: 'legumbre', hummus: 'legumbre',
  tofu: 'proteina_vegetal', tempeh: 'proteina_vegetal', soja_texturizada: 'proteina_vegetal', edamame: 'proteina_vegetal', seitan: 'proteina_vegetal', yogur_soja: 'proteina_vegetal',
};

function deriveMain(r: RecipeDraft): MainIngredient {
  let best: { m: MainIngredient; p: number } | null = null;
  for (const i of r.ingredients) {
    const m = MAIN_OF[i.foodId];
    const f = foodById.get(i.foodId);
    if (!m || !f) continue;
    const p = (f.per100.protein * i.amount) / 100;
    if (!best || p > best.p) best = { m, p };
  }
  if (best && best.p >= 5) return best.m;
  // sin proteína destacada: fruta, cereal o verdura según el peso dominante
  const weight = (pred: (id: string) => boolean) => r.ingredients.filter((i) => pred(i.foodId)).reduce((a, i) => a + i.amount, 0);
  const fruitIds = new Set(['platano', 'manzana', 'pera', 'naranja', 'mandarina', 'kiwi', 'fresas', 'frutos_rojos', 'frambuesas', 'melocoton', 'mango', 'pina', 'uvas', 'melon', 'sandia', 'cerezas', 'ciruela', 'caqui', 'higos', 'granada', 'datiles', 'pasas', 'albaricoque', 'orejones', 'lima']);
  const fruit = weight((id) => fruitIds.has(id));
  const cereal = weight((id) => foodById.get(id)?.category === 'cereales');
  const veg = weight((id) => foodById.get(id)?.category === 'verduras' && !fruitIds.has(id));
  if (best && fruit < 60 && cereal < 30) return best.m;
  if (fruit >= cereal && fruit >= veg) return 'fruta';
  if (cereal >= veg) return 'cereal';
  return 'verdura';
}

const ICON_OF_MAIN: Record<MainIngredient, Recipe['icon']> = {
  pollo: 'drumstick', pavo: 'drumstick', ternera: 'beef', cerdo: 'ham', pescado_blanco: 'fish', pescado_azul: 'fish', atun: 'fish',
  marisco: 'fish', huevo: 'egg', lacteo: 'milk', legumbre: 'bean', proteina_vegetal: 'leaf', cereal: 'wheat', verdura: 'carrot', fruta: 'apple',
};

const ICON_BY_WORD: [RegExp, Recipe['icon']][] = [
  [/pizza|coca\b/i, 'pizza'],
  [/crema |sopa|caldo|potaje|guiso|estofad|cocido|puchero|lentejas|garbanzos|alubias|fabada|marmitako|gazpacho|salmorejo/i, 'pot'],
  [/ensalada|bowl verde/i, 'salad'],
  [/bocadillo|sándwich|sandwich|tosta|tostada|wrap|burrito|pita|montadito|hamburguesa|taco|quesadilla|fajita/i, 'sandwich'],
  [/crep|tortitas|bizcocho|magdalena|muffin|galleta|brownie|tarta|coulant/i, 'cake'],
  [/helado|polo|sorbete|granizado/i, 'icecream'],
  [/huevo frito|huevos rotos|shakshuka|huevos al plato|pisto con huevo/i, 'eggfried'],
  [/natillas|arroz con leche|flan|mousse|pudding|panna|cuajada/i, 'dessert'],
  [/frutos secos|mix de/i, 'nut'],
  [/uva/i, 'grape'],
  [/naranja|mandarina|cítric/i, 'citrus'],
  [/plátano/i, 'banana'],
  [/cereza|frambuesa/i, 'cherry'],
  [/café/i, 'coffee'],
];

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function finalize(d: RecipeDraft): Recipe {
  const legacy = EXISTING_TITLES[d.id];
  if (legacy) d = { ...d, title: d.title ?? legacy[0], cuisine: d.cuisine ?? CUISINE_CODES[legacy[1]] };
  if (!d.title) throw new Error(`Receta ${d.id}: falta el nombre comercial`);
  const main = d.main ?? deriveMain(d);
  const category: RecipeCategory = d.category ?? (d.slots[0] === 'merienda' ? 'merienda' : d.slots[0]);
  const difficulty: Difficulty = d.difficulty ?? (d.minutes <= 15 ? 'facil' : d.minutes <= 40 ? 'media' : 'elaborada');
  const icon = d.icon ?? ICON_BY_WORD.find(([re]) => re.test(d.name))?.[1] ?? ICON_OF_MAIN[main];
  const hue = d.hue ?? hash(d.id) % 360;
  return { ...d, main, category, difficulty, icon, hue } as Recipe;
}
