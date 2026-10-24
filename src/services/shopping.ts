import { CATEGORY_ORDER } from '../data/foods';
import type { AppData, Food, ISODate, ShopCategory, ShoppingOverrides } from '../types';
import { n0, n1 } from '../lib/format';
import { getFood, getRecipe } from './catalog';

export interface ShoppingItem {
  key: string; // foodId o id manual
  name: string;
  qty: string; // texto mostrado
  autoQty: string; // cantidad calculada desde el menú
  amount: number; // cantidad total en g/ml (0 en manuales)
  unit: 'g' | 'ml' | '';
  category: ShopCategory;
  checked: boolean;
  edited: boolean;
  manual: boolean;
  usedIn: string[]; // nombres de recetas
}

export interface ShoppingGroup {
  category: ShopCategory;
  items: ShoppingItem[];
}

export const emptyOverrides = (): ShoppingOverrides => ({ checked: {}, qty: {}, removed: {}, manual: [] });

const COUNTABLE = /(unidad|mediano|mediana|filete|lomo|lata|bote|bandeja|bloque)/i;

/** Plural de cada palabra en español (unidad → unidades, bote escurrido → botes escurridos). */
function pluralize(label: string): string {
  return label
    .split(' ')
    .map((w) => (/[aeiouáéó]$/i.test(w) ? `${w}s` : /[dlnrzj]$/i.test(w) ? `${w}es` : w))
    .join(' ');
}

/**
 * Cantidad en g/ml y, si la ración típica es una pieza contable, su equivalencia aproximada.
 * La etiqueta de ración puede llevar fracción («1/4 bote» = 100 g → 1 bote = 400 g) o
 * varias piezas («2 unidades» = 20 g → 1 unidad = 10 g).
 */
export function formatAmount(food: Food, amount: number): string {
  let main: string;
  if (food.unit === 'g') main = amount >= 1000 ? `${n1(amount / 1000)} kg` : `${n0(Math.ceil(amount / 5) * 5)} g`;
  else main = amount >= 1000 ? `${n1(amount / 1000)} l` : `${n0(Math.ceil(amount / 10) * 10)} ml`;
  const p = food.portion;
  const m = p?.label.match(/^(\d+)(?:\/(\d+))?\s+(.+)$/);
  if (p && m && COUNTABLE.test(m[3]) && p.amount > 0) {
    const pieces = Number(m[1]) / (m[2] ? Number(m[2]) : 1);
    const unitSize = p.amount / pieces;
    let noun = m[3].replace(/\s*\(.*\)/, '').trim();
    if (pieces > 1) noun = noun.replace(/^unidades\b/, 'unidad');
    const count = Math.max(0.5, Math.round((amount / unitSize) * 2) / 2);
    main += ` · ≈ ${n1(count)} ${count <= 1 ? noun : pluralize(noun)}`;
  }
  return main;
}

/** Lista generada a partir del menú semanal + cambios manuales conservados. */
export function buildShoppingList(data: AppData, monday: ISODate): { groups: ShoppingGroup[]; freeDishes: string[]; total: number; done: number } {
  const ov = data.shopping[monday] ?? emptyOverrides();
  const acc = new Map<string, { amount: number; usedIn: Set<string> }>();
  const freeDishes: string[] = [];

  for (const meal of data.plan[monday] ?? []) {
    if (meal.status === 'omitida' || !data.profile.mealSlots.includes(meal.slot)) continue;
    const r = getRecipe(data, meal.recipeId);
    if (!r || r.custom) {
      if (meal.customName) freeDishes.push(meal.customName);
      continue;
    }
    for (const ing of r.ingredients) {
      const cur = acc.get(ing.foodId) ?? { amount: 0, usedIn: new Set<string>() };
      cur.amount += ing.amount * meal.portion;
      cur.usedIn.add(r.name);
      acc.set(ing.foodId, cur);
    }
  }

  const items: ShoppingItem[] = [];
  for (const [foodId, v] of acc) {
    if (ov.removed[foodId]) continue;
    const food = getFood(data, foodId);
    if (!food) continue;
    const autoQty = formatAmount(food, v.amount);
    const edited = ov.qty[foodId] !== undefined;
    items.push({
      key: foodId,
      name: food.name,
      qty: edited ? ov.qty[foodId] : autoQty,
      autoQty,
      amount: v.amount,
      unit: food.unit,
      category: food.category,
      checked: !!ov.checked[foodId],
      edited,
      manual: false,
      usedIn: [...v.usedIn],
    });
  }
  for (const m of ov.manual) {
    items.push({ key: m.id, name: m.name, qty: m.qty, autoQty: m.qty, amount: 0, unit: '', category: m.category, checked: m.checked, edited: false, manual: true, usedIn: [] });
  }

  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    items: items.filter((i) => i.category === category).sort((a, b) => a.name.localeCompare(b.name, 'es')),
  })).filter((g) => g.items.length);

  return { groups, freeDishes, total: items.length, done: items.filter((i) => i.checked).length };
}
