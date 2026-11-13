import type { AppData, ISODate, MainIngredient, MealExtra, MealReplacement, MealSlot, PlannedMeal, Recipe } from '../types';
import { addDays, weekDates } from '../lib/dates';
import { normalize, uid } from '../lib/format';
import { ALL_SLOTS, allRecipes, getFood, getRecipe } from './catalog';
import { conflictingFoods, foodMacros, recipeFit, recipeNutrition } from './nutrition';

/** Recetas candidatas para un tipo de comida según el perfil (dieta, alergias, alimentos que no gustan y tiempo). */
export function candidatesFor(data: AppData, slot: MealSlot): Recipe[] {
  const fit = allRecipes(data).filter((r) => !r.custom && r.slots.includes(slot) && recipeFit(data, r, data.profile).ok);
  const maxMin = data.profile.cookingTime;
  if (!maxMin) return fit;
  const timed = fit.filter((r) => r.minutes <= maxMin);
  return timed.length >= 3 ? timed : fit;
}

/* ------------------------------------------------------------------ */
/*  Generación de menús                                                */
/* ------------------------------------------------------------------ */

/** Reparto orientativo de la energía del día entre comidas (se normaliza con las comidas activas). */
const SLOT_SHARE: Record<MealSlot, number> = { desayuno: 0.22, mediamanana: 0.1, comida: 0.33, merienda: 0.1, cena: 0.25 };

const ANIMAL_MAIN = new Set<MainIngredient>(['pollo', 'pavo', 'ternera', 'cerdo', 'pescado_blanco', 'pescado_azul', 'atun', 'marisco']);
const FISH = new Set<MainIngredient>(['pescado_blanco', 'pescado_azul', 'atun', 'marisco']);
const RED_MEAT = new Set<MainIngredient>(['ternera', 'cerdo']);

/**
 * Postres del plan: fruta de temporada (meses en los que se propone) y, a veces, un lácteo.
 * Se añaden como `extras` de la comida (kind 'postre'): la receta no cambia y el usuario
 * puede cambiarlos, ajustar la cantidad o quitarlos.
 */
const DESSERTS: { foodId: string; months?: number[]; weight?: number }[] = [
  { foodId: 'manzana' }, { foodId: 'pera' }, { foodId: 'platano' }, { foodId: 'kiwi' }, { foodId: 'pina' },
  { foodId: 'naranja', months: [10, 11, 12, 1, 2, 3, 4, 5] }, { foodId: 'mandarina', months: [10, 11, 12, 1, 2, 3] },
  { foodId: 'fresas', months: [2, 3, 4, 5, 6] }, { foodId: 'cerezas', months: [5, 6, 7] }, { foodId: 'albaricoque', months: [5, 6, 7] },
  { foodId: 'melocoton', months: [6, 7, 8, 9] }, { foodId: 'ciruela', months: [6, 7, 8, 9] }, { foodId: 'sandia', months: [6, 7, 8, 9] },
  { foodId: 'melon', months: [6, 7, 8, 9] }, { foodId: 'higos', months: [8, 9] }, { foodId: 'uvas', months: [8, 9, 10, 11] },
  { foodId: 'granada', months: [9, 10, 11, 12] }, { foodId: 'caqui', months: [10, 11, 12] },
  { foodId: 'yogur', weight: 0.5 }, { foodId: 'yogur_griego', weight: 0.4 },
];
/** Proporción aproximada de comidas y cenas con postre. */
const DESSERT_RATE = 0.5;
const FRUIT_IDS = new Set(DESSERTS.filter((x) => !x.weight).map((x) => x.foodId).concat(['frutos_rojos', 'frambuesas', 'mango']));

function seeded(seed: string) {
  let a = 2166136261;
  for (let i = 0; i < seed.length; i++) a = Math.imul(a ^ seed.charCodeAt(i), 16777619);
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface RecipeInfo {
  kcal: number;
  veg: number; // g de verdura (sin fruta)
  liked: boolean;
}

const FRUIT = new Set(['platano', 'manzana', 'pera', 'naranja', 'mandarina', 'kiwi', 'fresas', 'frutos_rojos', 'frambuesas', 'melocoton', 'mango', 'pina', 'uvas', 'melon', 'sandia', 'cerezas', 'ciruela', 'caqui', 'higos', 'granada', 'limon', 'aguacate']);

function infoOf(data: AppData, r: Recipe, likes: string[]): RecipeInfo {
  const kcal = recipeNutrition(data, r).macros.kcal;
  let veg = 0;
  let liked = false;
  for (const i of r.ingredients) {
    const f = getFood(data, i.foodId);
    if (!f) continue;
    if (f.category === 'verduras' && !FRUIT.has(f.id) && f.id !== 'patata' && f.id !== 'boniato') veg += i.amount;
    if (likes.length) {
      const n = normalize(f.name);
      if (likes.some((l) => l.length > 2 && (n.includes(l) || normalize(f.id).includes(l)))) liked = true;
    }
  }
  return { kcal, veg, liked };
}

/** Semanas que cubre la rotación: no se repite una receta usada en las 4 semanas anteriores si hay alternativa. */
export const ROTATION_WEEKS = 4;

/**
 * Uso reciente de cada receta en las semanas anteriores ya planificadas
 * (peso 4 = semana pasada … 1 = hace cuatro semanas).
 */
function recentUse(data: AppData, monday: ISODate): Map<string, number> {
  const out = new Map<string, number>();
  for (let w = 1; w <= ROTATION_WEEKS; w++) {
    const prev = data.plan[addDays(monday, -7 * w)];
    if (!prev) continue;
    for (const m of prev) if (m.recipeId && !m.free) out.set(m.recipeId, (out.get(m.recipeId) ?? 0) + (ROTATION_WEEKS + 1 - w));
  }
  return out;
}

/** Recetas usadas hace 5–10 semanas: se pueden «recuperar» sin que parezca el mismo plan. */
function olderUse(data: AppData, monday: ISODate): Set<string> {
  const out = new Set<string>();
  for (let w = ROTATION_WEEKS + 1; w <= 10; w++) for (const m of data.plan[addDays(monday, -7 * w)] ?? []) if (m.recipeId) out.add(m.recipeId);
  return out;
}

/** Recetas que el usuario ha cambiado por otra en las últimas 8 semanas (señal de que no le apetecen). */
function rejected(data: AppData, monday: ISODate): Set<string> {
  const from = addDays(monday, -56);
  return new Set((data.replacements ?? []).filter((x) => x.date >= from && x.fromRecipeId && x.source !== 'regenerar').map((x) => x.fromRecipeId!));
}

/** Ingredientes «de despensa» que no cuentan para la variedad (aparecen en casi todo). */
const PANTRY = new Set(['aceite', 'ajo', 'cebolla', 'sal', 'limon', 'perejil', 'caldo', 'caldo_pollo', 'caldo_pescado', 'vinagre', 'miel', 'canela', 'levadura_quimica', 'salsa_soja', 'mostaza', 'cafe']);

export interface GenerateOptions {
  /** Comidas que se conservan tal cual (aceptadas, hechas…). Sus huecos no se rellenan. */
  keep?: PlannedMeal[];
  /** Solo se generan platos para estos días (por defecto, toda la semana). */
  dates?: ISODate[];
  /** Semilla distinta para obtener otra propuesta. */
  seed?: string;
  /** Recetas que se intentan evitar (p. ej. las que había antes de «Cambiar día»). */
  avoid?: Set<string>;
}

/**
 * Genera el menú de una semana a partir de la biblioteca.
 *
 * Para cada día y comida puntúa todas las recetas compatibles con el perfil
 * (alergias, dieta, «no me gusta», tiempo de cocina) y elige la mejor:
 * - no repite receta en la misma semana (solo si no queda otra opción);
 * - evita las recetas de las 4 semanas anteriores (rotación) y puede recuperar las más antiguas;
 * - no repite el ingrediente principal en comidas principales consecutivas (comida → cena → comida)
 *   y alterna carnes, pescados, huevos y legumbres (≈3 pescado, ≈2 legumbre, carne roja limitada);
 * - varía desayunos, meriendas y media mañana (no el mismo tipo dos días seguidos);
 * - reparte los ingredientes para que la semana no gire en torno a los mismos alimentos;
 * - evita que dos días tengan la misma combinación de proteínas en comida y cena;
 * - prima los platos con verdura en comida y cena, cenas más ligeras y recetas rápidas entre semana;
 * - busca la energía objetivo de cada comida y ajusta la ración (0,75–1,5);
 * - favorece favoritas y alimentos que le gustan; penaliza las recetas que el usuario suele cambiar.
 * El resultado es estable para una misma semana, unos mismos datos y una misma semilla.
 */
export function generateWeek(data: AppData, monday: ISODate, opts: GenerateOptions = {}): PlannedMeal[] {
  const rand = seeded(`${monday}|${data.profile.id}|${opts.seed ?? ''}`);
  // generador aparte para los postres: no altera la elección de recetas
  const drand = seeded(`${monday}|${data.profile.id}|${opts.seed ?? ''}|postre`);
  const dessertUse = new Map<string, number>();
  for (const m of opts.keep ?? []) for (const e of m.extras ?? []) if (e.kind === 'postre') dessertUse.set(e.foodId, (dessertUse.get(e.foodId) ?? 0) + 1);
  const dessertFoods = DESSERTS.filter((x) => getFood(data, x.foodId) && !conflictingFoods(data, [{ foodId: x.foodId }], data.profile).length);
  /** postre para una comida principal, o null (no toca, o no cabe en la energía de la comida) */
  const pickDessert = (date: ISODate, r: Recipe): MealExtra | null => {
    if (drand() >= DESSERT_RATE || r.category === 'postre') return null;
    // si el plato ya lleva fruta, no se repite como postre
    if (r.ingredients.some((i) => FRUIT_IDS.has(i.foodId) && i.amount >= 60)) return null;
    const month = Number(date.slice(5, 7));
    const sameDay = new Set(out.filter((m) => m.date === date).flatMap((m) => (m.extras ?? []).map((e) => e.foodId)));
    let best: { id: string; score: number } | null = null;
    for (const d of dessertFoods) {
      if (d.months && !d.months.includes(month)) continue;
      const score = drand() * (d.weight ?? 1) * 3 - (dessertUse.get(d.foodId) ?? 0) * 2 - (sameDay.has(d.foodId) ? 10 : 0);
      if (!best || score > best.score) best = { id: d.foodId, score };
    }
    const f = best && getFood(data, best.id);
    if (!f) return null;
    return { id: uid('ex'), foodId: f.id, amount: f.portion?.amount ?? 120, kind: 'postre' };
  };
  const slots = ALL_SLOTS.filter((s) => data.profile.mealSlots.includes(s));
  const shareTotal = slots.reduce((a, s) => a + SLOT_SHARE[s], 0) || 1;
  const kcalTarget = data.profile.targets?.kcal;
  const likes = data.profile.likes.map((l) => normalize(l)).filter(Boolean);
  const favs = new Set(data.favorites.recipes);
  const recent = recentUse(data, monday);
  const older = olderUse(data, monday);
  const notWanted = rejected(data, monday);
  const vegan = data.profile.dietType === 'vegana' || data.profile.dietType === 'vegetariana';
  const recipeOf = (id: string | null | undefined) => (id ? allRecipes(data).find((r) => r.id === id) : undefined);

  const pools = new Map(slots.map((s) => [s, candidatesFor(data, s)]));
  const info = new Map<string, RecipeInfo>();
  const getInfo = (r: Recipe) => {
    let i = info.get(r.id);
    if (!i) info.set(r.id, (i = infoOf(data, r, likes)));
    return i;
  };

  const usedWeek = new Map<string, number>();
  const mainCount = new Map<MainIngredient, number>();
  const ingredientUse = new Map<string, number>();
  const out: PlannedMeal[] = [];
  const isMain = (s: MealSlot) => s === 'comida' || s === 'cena';
  const register = (m: PlannedMeal) => {
    out.push(m);
    const r = m.free ? undefined : recipeOf(m.recipeId);
    if (!r) return;
    usedWeek.set(r.id, (usedWeek.get(r.id) ?? 0) + 1);
    if (isMain(m.slot)) mainCount.set(r.main, (mainCount.get(r.main) ?? 0) + 1);
    for (const i of r.ingredients) if (!PANTRY.has(i.foodId) && i.amount >= 25) ingredientUse.set(i.foodId, (ingredientUse.get(i.foodId) ?? 0) + 1);
  };
  const keep = opts.keep ?? [];
  keep.forEach(register);
  const kept = new Set(keep.map((m) => `${m.date}|${m.slot}`));
  const onlyDates = opts.dates ? new Set(opts.dates) : null;
  const ordered = (a: PlannedMeal, b: PlannedMeal) => a.date.localeCompare(b.date) || ALL_SLOTS.indexOf(a.slot) - ALL_SLOTS.indexOf(b.slot);
  /** última comida principal anterior a (fecha, franja) */
  const previousMain = (date: ISODate, slot: MealSlot) =>
    [...out].filter((m) => isMain(m.slot) && (m.date < date || (m.date === date && ALL_SLOTS.indexOf(m.slot) < ALL_SLOTS.indexOf(slot)))).sort(ordered).pop();
  const nextMain = (date: ISODate, slot: MealSlot) =>
    [...out].filter((m) => isMain(m.slot) && (m.date > date || (m.date === date && ALL_SLOTS.indexOf(m.slot) > ALL_SLOTS.indexOf(slot)))).sort(ordered)[0];

  weekDates(monday).forEach((date, dayIdx) => {
    if (onlyDates && !onlyDates.has(date)) return;
    const weekend = dayIdx >= 5;
    const yesterday = addDays(date, -1);
    for (const slot of slots) {
      if (kept.has(`${date}|${slot}`)) continue;
      const pool = pools.get(slot) ?? [];
      if (!pool.length) continue;
      const target = kcalTarget ? (kcalTarget * SLOT_SHARE[slot]) / shareTotal : null;
      const todayIds = new Set(out.filter((m) => m.date === date).map((m) => m.recipeId));
      const yKind = recipeOf(out.find((m) => m.date === yesterday && m.slot === slot)?.recipeId)?.main;
      const tomorrowKind = recipeOf(out.find((m) => m.date === addDays(date, 1) && m.slot === slot)?.recipeId)?.main;
      const prevMainKind = isMain(slot) ? recipeOf(previousMain(date, slot)?.recipeId)?.main : undefined;
      const nextMainKind = isMain(slot) ? recipeOf(nextMain(date, slot)?.recipeId)?.main : undefined;
      // combinaciones comida/cena de otros días (para que no haya dos días casi iguales)
      const otherMain = isMain(slot) ? recipeOf(out.find((m) => m.date === date && isMain(m.slot) && m.slot !== slot)?.recipeId)?.main : undefined;
      const dayPairs = new Set<string>();
      if (otherMain) {
        for (const d of weekDates(monday)) {
          if (d === date) continue;
          const kinds = out.filter((m) => m.date === d && isMain(m.slot)).map((m) => recipeOf(m.recipeId)?.main).filter(Boolean).sort();
          if (kinds.length === 2) dayPairs.add(kinds.join('|'));
        }
      }

      let best: { r: Recipe; score: number } | null = null;
      for (const r of pool) {
        const inf = getInfo(r);
        let score = rand() * 10;
        // sin repeticiones en la semana ni el mismo día
        score -= (usedWeek.get(r.id) ?? 0) * 120;
        if (todayIds.has(r.id)) score -= 200;
        // rotación de 4 semanas y recuperación de recetas antiguas
        if (recent.has(r.id)) score -= 30 + (recent.get(r.id) ?? 0) * 10; // 4 semanas: pesa más que el ajuste fino de calorías
        if (!recent.has(r.id) && older.has(r.id)) score += 2;
        if (notWanted.has(r.id)) score -= 8;
        if (opts.avoid?.has(r.id)) score -= 60;
        // categoría propia de la franja (un postre no sustituye a una merienda salvo que encaje)
        if (r.category === 'postre') score -= 10;
        if (slot === 'cena' && r.category === 'cena') score += 4;
        if (slot === 'comida' && r.category === 'comida') score += 4;
        // mismo tipo de plato que ayer o mañana en la misma franja
        if (yKind === r.main) score -= isMain(slot) ? 14 : 10;
        if (tomorrowKind === r.main) score -= isMain(slot) ? 10 : 6;
        // variedad de ingredientes en la semana
        let overlap = 0;
        for (const i of r.ingredients) if (!PANTRY.has(i.foodId) && i.amount >= 25) overlap += ingredientUse.get(i.foodId) ?? 0;
        score -= Math.min(overlap, 12) * 1.2;
        if (isMain(slot)) {
          if (prevMainKind === r.main) score -= 30; // comidas principales consecutivas
          if (nextMainKind === r.main) score -= 20;
          if (otherMain && dayPairs.has([otherMain, r.main].sort().join('|'))) score -= 12;
          score -= (mainCount.get(r.main) ?? 0) * 7;
          const fish = [...FISH].reduce((a, k) => a + (mainCount.get(k) ?? 0), 0);
          const legumes = mainCount.get('legumbre') ?? 0;
          const eggs = mainCount.get('huevo') ?? 0;
          const red = [...RED_MEAT].reduce((a, k) => a + (mainCount.get(k) ?? 0), 0);
          if (FISH.has(r.main) && fish < 3) score += 9;
          if (r.main === 'legumbre' && legumes < 2) score += 9;
          if (r.main === 'huevo' && eggs < 2) score += 3;
          if (RED_MEAT.has(r.main) && red >= 3) score -= 18;
          if (!vegan && !ANIMAL_MAIN.has(r.main) && r.main !== 'legumbre' && r.main !== 'huevo') score -= 3;
          score += Math.min(inf.veg, 250) / 25; // hasta +10 por verdura
          if (slot === 'cena' && r.tags.includes('ligera')) score += 3;
          // entre semana, mejor recetas que no lleven toda la tarde
          if (!weekend && r.minutes > 45 && !r.tags.includes('batch')) score -= 4;
          if (weekend && r.difficulty === 'elaborada') score += 2;
        }
        if (target && inf.kcal > 0) {
          const ratio = inf.kcal / target;
          const fixable = ratio >= 0.67 && ratio <= 1.33; // se puede ajustar con la ración
          score -= Math.abs(1 - Math.min(Math.max(ratio, 0.67), 1.33)) * 25 + (fixable ? 0 : 12);
        }
        if (favs.has(r.id)) score += 6;
        if (inf.liked) score += 6;
        if (!best || score > best.score) best = { r, score };
      }
      if (!best) continue;
      const r = best.r;
      let portion = 1;
      const kcal = getInfo(r).kcal;
      // postre en algunas comidas y cenas: la ración del plato se ajusta para dejarle sitio
      let dessert = isMain(slot) ? pickDessert(date, r) : null;
      const dk = dessert ? foodMacros(getFood(data, dessert.foodId)!, dessert.amount).kcal : 0;
      if (dessert && target && kcal > 0 && (target - dk) / kcal < 0.75) dessert = null;
      const room = target ? target - (dessert ? dk : 0) : null;
      if (room && kcal > 0) portion = Math.min(1.5, Math.max(0.75, Math.round((room / kcal) * 4) / 4));
      if (dessert) dessertUse.set(dessert.foodId, (dessertUse.get(dessert.foodId) ?? 0) + 1);
      register({ id: uid('pm'), date, slot, recipeId: r.id, portion, status: 'pendiente', ...(dessert ? { extras: [dessert] } : {}) });
    }
  });
  return out.filter((m) => !keep.includes(m)).concat(keep).sort(ordered);
}

/** Platos que se conservan al regenerar: hechos, omitidos, aceptados o de días pasados. */
function keepOnRegenerate(m: PlannedMeal, fromDate: ISODate) {
  return m.date < fromDate || m.status !== 'pendiente' || !!m.accepted || !!m.free;
}

/**
 * Nueva propuesta para la semana: cambia SOLO los platos pendientes y no aceptados
 * desde `fromDate`. Devuelve cuántos platos han cambiado.
 */
export function regenerateWeek(data: AppData, monday: ISODate, fromDate: ISODate, seed: string): number {
  const week = data.plan[monday] ?? [];
  const keep = week.filter((m) => keepOnRegenerate(m, fromDate));
  const before = new Map(week.map((m) => [`${m.date}|${m.slot}`, m.recipeId]));
  const fresh = generateWeek(data, monday, { keep, seed, dates: weekDates(monday).filter((d) => d >= fromDate) });
  data.plan[monday] = fresh;
  let changed = 0;
  for (const m of fresh) {
    if (keep.includes(m)) continue;
    const prev = before.get(`${m.date}|${m.slot}`);
    if (prev !== m.recipeId) {
      changed++;
      logReplacement(data, { date: m.date, slot: m.slot, fromRecipeId: prev ?? null, toRecipeId: m.recipeId, source: 'regenerar' });
    }
  }
  return changed;
}

/**
 * Cambia un día entero: nuevos platos para todas las comidas PENDIENTES de ese día
 * (las hechas u omitidas se conservan). El resto de la semana no se toca.
 */
export function regenerateDay(data: AppData, date: ISODate, seed: string): number {
  const monday = startOfWeekLocal(date);
  const week = data.plan[monday] ?? [];
  const keep = week.filter((m) => m.date !== date || m.status !== 'pendiente' || m.free);
  const before = week.filter((m) => m.date === date && m.status === 'pendiente' && !m.free);
  const avoid = new Set(before.map((m) => m.recipeId).filter((x): x is string => !!x));
  data.plan[monday] = generateWeek(data, monday, { keep, dates: [date], seed, avoid });
  let changed = 0;
  for (const m of data.plan[monday].filter((x) => x.date === date && !keep.includes(x))) {
    const prev = before.find((b) => b.slot === m.slot);
    if (prev?.recipeId === m.recipeId) continue;
    changed++;
    logReplacement(data, { date, slot: m.slot, fromRecipeId: prev?.recipeId ?? null, toRecipeId: m.recipeId, source: 'dia' });
  }
  return changed;
}

/** Marca como aceptados todos los platos pendientes de la semana (no se cambiarán al regenerar). */
export function acceptWeek(data: AppData, monday: ISODate): number {
  let n = 0;
  for (const m of data.plan[monday] ?? []) if (!m.accepted && !m.free && m.status === 'pendiente') { m.accepted = true; n++; }
  return n;
}

/** Registra una sustitución de plato (historial meal_replacements, máximo 300 entradas). */
export function logReplacement(data: AppData, r: Omit<MealReplacement, 'id' | 'at'>) {
  data.replacements ??= [];
  data.replacements.push({ ...r, id: uid('rep'), at: new Date().toISOString() });
  if (data.replacements.length > 300) data.replacements.splice(0, data.replacements.length - 300);
}

export interface PlanDiagnostics {
  /** recetas compatibles por franja */
  pool: Partial<Record<MealSlot, number>>;
  repeatsInWeek: number;
  repeatsFromLast4Weeks: number;
  consecutiveSameMain: number;
  notes: string[];
}

/** Revisión del menú de una semana: indica qué reglas no se han podido cumplir y por qué. */
export function planDiagnostics(data: AppData, monday: ISODate): PlanDiagnostics {
  const meals = (data.plan[monday] ?? []).filter((m) => data.profile.mealSlots.includes(m.slot) && m.recipeId);
  const slots = ALL_SLOTS.filter((s) => data.profile.mealSlots.includes(s));
  const pool: Partial<Record<MealSlot, number>> = {};
  for (const s of slots) pool[s] = candidatesFor(data, s).length;
  const ids = meals.map((m) => m.recipeId!);
  const repeatsInWeek = ids.length - new Set(ids).size;
  const recent = recentUse(data, monday);
  const repeatsFromLast4Weeks = new Set(ids.filter((id) => recent.has(id))).size;
  const mains = meals
    .filter((m) => m.slot === 'comida' || m.slot === 'cena')
    .sort((a, b) => a.date.localeCompare(b.date) || ALL_SLOTS.indexOf(a.slot) - ALL_SLOTS.indexOf(b.slot))
    .map((m) => getRecipeMain(data, m.recipeId!));
  let consecutiveSameMain = 0;
  for (let i = 1; i < mains.length; i++) if (mains[i] && mains[i] === mains[i - 1]) consecutiveSameMain++;
  const notes: string[] = [];
  // 7 días × 5 semanas: con menos de 35 recetas en una franja alguna se repetirá dentro de 4 semanas
  const small = slots.filter((s) => (pool[s] ?? 0) < 35);
  if (small.length)
    notes.push(
      `Con tus preferencias hay pocas recetas para ${small.map((s) => `${SLOT_LABEL[s]} (${pool[s]})`).join(', ')}: puede que se repitan antes de 4 semanas. Se han priorizado tus alergias, intolerancias y preferencias.`,
    );
  if (repeatsInWeek > 0) notes.push(`${repeatsInWeek} plato(s) se repiten esta semana porque no había más opciones compatibles.`);
  if (repeatsFromLast4Weeks > 0 && !small.length) notes.push(`${repeatsFromLast4Weeks} receta(s) ya aparecieron en las últimas 4 semanas.`);
  if (data.profile.cookingTime && slots.some((s) => candidatesFor(data, s).every((r) => r.minutes > data.profile.cookingTime!)))
    notes.push(`Algunas comidas superan tus ${data.profile.cookingTime} minutos porque no hay suficientes recetas más rápidas compatibles.`);
  return { pool, repeatsInWeek, repeatsFromLast4Weeks, consecutiveSameMain, notes };
}

const SLOT_LABEL: Record<MealSlot, string> = { desayuno: 'desayunos', mediamanana: 'media mañana', comida: 'comidas', merienda: 'meriendas', cena: 'cenas' };
function getRecipeMain(data: AppData, id: string): MainIngredient | undefined {
  return allRecipes(data).find((r) => r.id === id)?.main;
}

/** Recetas usadas en el plan entre dos fechas (incluidas). */
function usedBetween(data: AppData, from: ISODate, to: ISODate): Set<string> {
  const out = new Set<string>();
  for (const week of Object.values(data.plan)) for (const m of week) if (m.recipeId && m.date >= from && m.date <= to) out.add(m.recipeId);
  return out;
}

/**
 * «Sorpréndeme»: una receta compatible con el perfil que no se haya usado en las
 * últimas 4 semanas (ni esté prevista en los próximos 7 días). Si no queda ninguna,
 * la menos reciente. Favorece ligeramente favoritas y alimentos que le gustan.
 */
export function surprise(
  data: AppData,
  opts: { slot?: MealSlot; category?: Recipe['category']; date?: ISODate; exclude?: Set<string>; maxMinutes?: number } = {},
): Recipe | null {
  const base = opts.slot ? candidatesFor(data, opts.slot) : allRecipes(data).filter((r) => !r.custom && recipeFit(data, r, data.profile).ok);
  let pool = base.filter((r) => (!opts.category || r.category === opts.category) && !opts.exclude?.has(r.id));
  if (opts.maxMinutes) {
    const quick = pool.filter((r) => r.minutes <= opts.maxMinutes!);
    if (quick.length) pool = quick;
  }
  if (!pool.length) return null;
  const date = opts.date ?? new Date().toISOString().slice(0, 10);
  const recent = usedBetween(data, addDays(date, -7 * ROTATION_WEEKS), addDays(date, 7));
  const fresh = pool.filter((r) => !recent.has(r.id));
  const list = fresh.length ? fresh : pool;
  const favs = new Set(data.favorites.recipes);
  const likes = data.profile.likes.map((l) => normalize(l)).filter(Boolean);
  const weights = list.map((r) => 1 + (favs.has(r.id) ? 1 : 0) + (likes.length && infoOf(data, r, likes).liked ? 1 : 0));
  let x = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < list.length; i++) if ((x -= weights[i]) <= 0) return list[i];
  return list[list.length - 1];
}

/** Sorpresa para una comida concreta del plan (no la cambia: solo la propone). */
export function surpriseRecipe(data: AppData, meal: PlannedMeal, opts: { anySlot?: boolean; exclude?: Set<string> } = {}): Recipe | null {
  const exclude = new Set(opts.exclude);
  if (meal.recipeId) exclude.add(meal.recipeId);
  return surprise(data, { slot: opts.anySlot ? undefined : meal.slot, date: meal.date, exclude });
}

/**
 * Vuelve a generar los platos PENDIENTES desde `fromDate` en adelante (semanas ya creadas),
 * respetando las preferencias actuales. Lo hecho u omitido no se toca; lo aceptado se conserva
 * salvo que ya no encaje con el perfil (p. ej. una alergia nueva).
 */
export function regenerateFrom(data: AppData, fromDate: ISODate): void {
  for (const monday of Object.keys(data.plan)) {
    if (monday < startOfWeekLocal(fromDate)) continue;
    const keep = data.plan[monday].filter((m) => {
      if (m.date < fromDate || m.status !== 'pendiente' || m.free) return true;
      if (!m.accepted) return false;
      const r = getRecipe(data, m.recipeId);
      return !r || r.custom || recipeFit(data, r, data.profile).ok;
    });
    data.plan[monday] = generateWeek(data, monday, { keep, dates: weekDates(monday).filter((d) => d >= fromDate) });
  }
}

function startOfWeekLocal(d: ISODate): ISODate {
  const dt = new Date(`${d}T12:00:00`);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
