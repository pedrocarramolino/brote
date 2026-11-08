import type { AppData, ISODate, MainIngredient, MealSlot, PlannedMeal, Recipe } from '../types';
import { addDays, weekDates } from '../lib/dates';
import { normalize, uid } from '../lib/format';
import { ALL_SLOTS, allRecipes, getFood } from './catalog';
import { recipeFit, recipeNutrition } from './nutrition';

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

/**
 * Uso reciente de cada receta en las semanas anteriores ya planificadas
 * (peso 3 = semana pasada, 2 = hace dos semanas, 1 = hace tres).
 */
function recentUse(data: AppData, monday: ISODate): Map<string, number> {
  const out = new Map<string, number>();
  for (let w = 1; w <= 3; w++) {
    const prev = data.plan[addDays(monday, -7 * w)];
    if (!prev) continue;
    for (const m of prev) if (m.recipeId) out.set(m.recipeId, (out.get(m.recipeId) ?? 0) + (4 - w));
  }
  return out;
}

/**
 * Genera el menú de una semana a partir de la biblioteca.
 *
 * Para cada día y comida puntúa todas las recetas compatibles con el perfil
 * (alergias, dieta, «no me gusta», tiempo de cocina) y elige la mejor:
 * - no repite receta en la misma semana (solo si no queda otra opción);
 * - penaliza las recetas usadas en las tres semanas anteriores (rotación);
 * - alterna la proteína principal entre comida y cena y entre días seguidos,
 *   procura pescado ~3 veces y legumbre ~2 veces por semana y limita la carne roja;
 * - prima los platos con verdura en comida y cena y evita cenas muy cargadas de hidratos;
 * - busca la energía objetivo de cada comida y ajusta la ración (0,75–1,5);
 * - favorece favoritas y recetas con alimentos que le gustan al usuario.
 * El resultado es estable para una misma semana y unos mismos datos.
 */
export function generateWeek(data: AppData, monday: ISODate): PlannedMeal[] {
  const rand = seeded(`${monday}|${data.profile.id}`);
  const slots = ALL_SLOTS.filter((s) => data.profile.mealSlots.includes(s));
  const shareTotal = slots.reduce((a, s) => a + SLOT_SHARE[s], 0) || 1;
  const kcalTarget = data.profile.targets?.kcal;
  const likes = data.profile.likes.map((l) => normalize(l)).filter(Boolean);
  const favs = new Set(data.favorites.recipes);
  const recent = recentUse(data, monday);
  const vegan = data.profile.dietType === 'vegana' || data.profile.dietType === 'vegetariana';

  const pools = new Map(slots.map((s) => [s, candidatesFor(data, s)]));
  const info = new Map<string, RecipeInfo>();
  const getInfo = (r: Recipe) => {
    let i = info.get(r.id);
    if (!i) info.set(r.id, (i = infoOf(data, r, likes)));
    return i;
  };

  const usedWeek = new Map<string, number>();
  const mainCount = new Map<MainIngredient, number>();
  const out: PlannedMeal[] = [];
  const isMain = (s: MealSlot) => s === 'comida' || s === 'cena';

  weekDates(monday).forEach((date, dayIdx) => {
    const yesterday = dayIdx > 0 ? addDays(date, -1) : null;
    for (const slot of slots) {
      const pool = pools.get(slot) ?? [];
      if (!pool.length) continue;
      const target = kcalTarget ? (kcalTarget * SLOT_SHARE[slot]) / shareTotal : null;
      const todayMains = out.filter((m) => m.date === date && isMain(m.slot)).map((m) => m.recipeId);
      const todayMainKinds = todayMains.map((id) => pool.find((r) => r.id === id)?.main ?? allRecipes(data).find((r) => r.id === id)?.main);
      const yesterdaySame = yesterday ? out.find((m) => m.date === yesterday && m.slot === slot)?.recipeId : null;
      const yesterdayKind = yesterdaySame ? allRecipes(data).find((r) => r.id === yesterdaySame)?.main : null;
      const todayIds = new Set(out.filter((m) => m.date === date).map((m) => m.recipeId));

      let best: { r: Recipe; score: number } | null = null;
      for (const r of pool) {
        const inf = getInfo(r);
        let score = rand() * 12;
        // sin repeticiones en la semana ni el mismo día
        score -= (usedWeek.get(r.id) ?? 0) * 120;
        if (todayIds.has(r.id)) score -= 200;
        // rotación con semanas anteriores
        score -= (recent.get(r.id) ?? 0) * 9;
        // categoría propia de la franja (un postre no sustituye a una merienda salvo que encaje)
        if (r.category === 'postre') score -= 10;
        if (slot === 'cena' && r.category === 'cena') score += 4;
        if (slot === 'comida' && r.category === 'comida') score += 4;
        if (isMain(slot)) {
          if (todayMainKinds.includes(r.main)) score -= 30;
          if (yesterdayKind === r.main) score -= 14;
          score -= (mainCount.get(r.main) ?? 0) * 7;
          const fish = [...FISH].reduce((a, k) => a + (mainCount.get(k) ?? 0), 0);
          const legumes = mainCount.get('legumbre') ?? 0;
          const red = [...RED_MEAT].reduce((a, k) => a + (mainCount.get(k) ?? 0), 0);
          if (FISH.has(r.main) && fish < 3) score += 9;
          if (r.main === 'legumbre' && legumes < 2) score += 9;
          if (RED_MEAT.has(r.main) && red >= 3) score -= 18;
          if (!vegan && !ANIMAL_MAIN.has(r.main) && r.main !== 'legumbre' && r.main !== 'huevo') score -= 3;
          score += Math.min(inf.veg, 250) / 25; // hasta +10 por verdura
          if (slot === 'cena' && r.tags.includes('ligera')) score += 3;
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
      usedWeek.set(r.id, (usedWeek.get(r.id) ?? 0) + 1);
      if (isMain(slot)) mainCount.set(r.main, (mainCount.get(r.main) ?? 0) + 1);
      let portion = 1;
      const kcal = getInfo(r).kcal;
      if (target && kcal > 0) portion = Math.min(1.5, Math.max(0.75, Math.round((target / kcal) * 4) / 4));
      out.push({ id: uid('pm'), date, slot, recipeId: r.id, portion, status: 'pendiente' });
    }
  });
  return out;
}

/** Receta al azar para «Sorpréndeme»: compatible con el perfil y distinta de las usadas recientemente. */
export function surpriseRecipe(data: AppData, meal: PlannedMeal, opts: { anySlot?: boolean; exclude?: Set<string> } = {}): Recipe | null {
  const pool = (opts.anySlot
    ? allRecipes(data).filter((r) => !r.custom && recipeFit(data, r, data.profile).ok)
    : candidatesFor(data, meal.slot)
  ).filter((r) => r.id !== meal.recipeId && !opts.exclude?.has(r.id));
  if (!pool.length) return null;
  // recetas usadas en los últimos 14 días alrededor de esta comida
  const recent = new Set<string>();
  const from = addDays(meal.date, -14);
  const to = addDays(meal.date, 7);
  for (const week of Object.values(data.plan)) for (const m of week) if (m.recipeId && m.date >= from && m.date <= to) recent.add(m.recipeId);
  const fresh = pool.filter((r) => !recent.has(r.id));
  const list = fresh.length ? fresh : pool;
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Vuelve a generar los platos PENDIENTES desde `fromDate` en adelante (semanas ya creadas),
 * respetando las preferencias actuales. Lo hecho u omitido no se toca.
 */
export function regenerateFrom(data: AppData, fromDate: ISODate): void {
  for (const monday of Object.keys(data.plan)) {
    if (monday < startOfWeekLocal(fromDate)) continue;
    const fresh = generateWeek(data, monday);
    const kept = data.plan[monday].filter((m) => m.date < fromDate || m.status !== 'pendiente');
    const keptKeys = new Set(kept.map((m) => `${m.date}|${m.slot}`));
    data.plan[monday] = [...kept, ...fresh.filter((m) => m.date >= fromDate && !keptKeys.has(`${m.date}|${m.slot}`))];
  }
}

function startOfWeekLocal(d: ISODate): ISODate {
  const dt = new Date(`${d}T12:00:00`);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
