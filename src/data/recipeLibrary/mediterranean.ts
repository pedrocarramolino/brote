import type { Recipe } from '../../types';
import { BASE_FOODS } from '../foods';

/**
 * Comida de mediodía según el patrón de la dieta mediterránea: un plato completo con
 * verdura u hortaliza, una fuente de hidratos (pan, cereal, patata o legumbre), proteína
 * y aceite de oliva como grasa. Se aplica a las recetas de la BIBLIOTECA al cargarla (no a
 * los platos del usuario) y queda a la vista en sus ingredientes y pasos:
 * - comida sin verdura → se acompaña de ensalada de lechuga y tomate;
 * - comida sin hidratos → se acompaña de pan integral;
 * - cena ligera (sin hidratos, sin verdura o < 400 kcal) → solo se propone para cenar.
 */
const foods = new Map(BASE_FOODS.map((f) => [f.id, f]));

const FRUIT = new Set(['platano', 'manzana', 'pera', 'naranja', 'mandarina', 'kiwi', 'fresas', 'frutos_rojos', 'frambuesas', 'melocoton', 'nectarina', 'paraguaya', 'albaricoque', 'mango', 'papaya', 'pina', 'uvas', 'melon', 'sandia', 'cerezas', 'ciruela', 'caqui', 'higos', 'granada', 'chirimoya', 'pomelo', 'limon', 'lima', 'datiles', 'pasas', 'orejones', 'aguacate', 'aceitunas', 'coco_fresco']);
const NOT_VEG = new Set(['ajo', 'perejil', 'albahaca', 'cilantro', 'jengibre', 'cebolleta']);
const STARCH = new Set([
  'pan', 'pan_integral', 'pan_centeno', 'pan_pita', 'pan_burger', 'pan_hamburguesa', 'tortilla_trigo', 'tortilla_maiz', 'tortitas_arroz', 'masa_pizza',
  'arroz', 'arroz_integral', 'arroz_basmati', 'arroz_integral_cocido', 'pasta', 'pasta_integral', 'pasta_huevo', 'pasta_cocida', 'fideos_arroz', 'quinoa',
  'cuscus', 'bulgur', 'mijo', 'semola', 'gnocchi', 'harina', 'harina_integral', 'patata', 'boniato', 'maiz',
  'garbanzos', 'lentejas', 'alubias', 'alubias_rojas', 'alubias_negras', 'habas', 'garbanzos_secos', 'lentejas_secas', 'alubias_secas',
]);

const isVeg = (id: string) => {
  const f = foods.get(id);
  return !!f && f.category === 'verduras' && !FRUIT.has(id) && !NOT_VEG.has(id) && id !== 'patata' && id !== 'boniato';
};
const grams = (r: Recipe, pred: (id: string) => boolean) => r.ingredients.filter((i) => pred(i.foodId)).reduce((a, i) => a + i.amount, 0);
const kcalOf = (r: Recipe) => r.ingredients.reduce((a, i) => a + ((foods.get(i.foodId)?.per100.kcal ?? 0) * i.amount) / 100, 0);

/** Verdura (g por ración) de una receta, sin contar fruta, ajo ni hierbas. */
export const vegGrams = (r: Recipe) => grams(r, isVeg);
/** Hidratos «de plato» (pan, cereal, patata, legumbre) en g por ración. */
export const starchGrams = (r: Recipe) => grams(r, (id) => STARCH.has(id));

function add(r: Recipe, foodId: string, amount: number): Recipe['ingredients'] {
  const has = r.ingredients.find((i) => i.foodId === foodId);
  return has ? r.ingredients.map((i) => (i.foodId === foodId ? { ...i, amount: i.amount + amount } : i)) : [...r.ingredients, { foodId, amount }];
}

/**
 * Comidas con muy poca proteína para ser plato único de mediodía (< 17 g): se completan
 * con un ingrediente que encaja con la receta. La cantidad y el paso quedan a la vista.
 */
const PROTEIN_FIX: Record<string, { add: [string, number][]; step: string }> = {
  'risotto-setas': { add: [['jamon_serrano', 25]], step: 'Termina con virutas de jamón serrano por encima.' },
  'risotto-provolone-setas': { add: [['jamon_serrano', 25]], step: 'Termina con virutas de jamón serrano por encima.' },
  'risotto-setas-queso-tierno': { add: [['jamon_serrano', 25]], step: 'Termina con virutas de jamón serrano por encima.' },
  'gnocchi-pesto-tomate-cherry': { add: [['mozzarella', 50]], step: 'Añade mozzarella fresca en dados al servir.' },
  'gnocchi-brocoli-anchoas': { add: [['atun', 60]], step: 'Incorpora el atún escurrido al saltear.' },
  'gnocchi-calabaza-salvia': { add: [['requeson', 60]], step: 'Sirve con requesón por encima.' },
  'salmorejo-huevo-jamon': { add: [['huevo', 25], ['jamon_serrano', 20]], step: 'Sírvelo como plato único: con un huevo duro entero y más jamón picado por encima.' },
  'borraja-patata-almejas': { add: [['almejas', 60]], step: 'Aumenta la cantidad de almejas para que sea un plato completo.' },
  'burger-portobello': { add: [['mozzarella', 30]], step: 'Pon una segunda loncha de mozzarella sobre el portobello.' },
};

export function mediterraneanMeal(r: Recipe): Recipe {
  if (r.custom) return r;
  const fix = PROTEIN_FIX[r.id];
  if (fix) {
    for (const [id, g] of fix.add) r = { ...r, ingredients: add(r, id, g) };
    r = { ...r, steps: [...r.steps, fix.step] };
  }
  // cenas ligeras: no se proponen como comida de mediodía
  if (r.category === 'cena' && r.slots.includes('comida')) {
    if (kcalOf(r) < 400 || vegGrams(r) < 60 || starchGrams(r) < 25) return { ...r, slots: r.slots.filter((s) => s !== 'comida') };
    return r;
  }
  if (r.category !== 'comida') return r;
  let out = r;
  const extraSteps: string[] = [];
  if (vegGrams(out) < 60) {
    for (const [id, g] of [['lechuga', 50], ['tomate', 70], ['aceite', 3]] as const) out = { ...out, ingredients: add(out, id, g) };
    extraSteps.push('Acompaña con una ensalada de lechuga y tomate aliñada con aceite de oliva virgen extra.');
  }
  if (starchGrams(out) < 25) {
    out = { ...out, ingredients: add(out, 'pan_integral', 40) };
    extraSteps.push('Acompaña con una rebanada de pan integral (40 g).');
  }
  return extraSteps.length ? { ...out, steps: [...out.steps, ...extraSteps] } : out;
}
