import type { AppData, ISODate, MealSlot, PlannedMeal, Recipe } from '../types';
import { todayISO } from '../lib/dates';
import { allRecipes, getRecipe } from './catalog';
import { recipeFit } from './nutrition';
import { recipeMacros } from './recipeMeta';

/**
 * Biblioteca → recetas → planificación semanal → registro diario.
 * Este módulo solo LEE la biblioteca y el plan: no modifica el menú.
 */

export interface HistoryEntry {
  recipe: Recipe;
  date: ISODate;
  slot: MealSlot;
  status: PlannedMeal['status'];
  /** veces que aparece en el plan hasta hoy */
  times: number;
}

/**
 * Historial de recetas (equivale a la tabla recipe_history): platos del plan con fecha
 * igual o anterior a hoy, de la más reciente a la más antigua, una entrada por receta.
 * Los platos omitidos no cuentan como usados.
 */
export function recipeHistory(data: AppData, until: ISODate = todayISO()): HistoryEntry[] {
  const seen = new Map<string, HistoryEntry>();
  const meals: PlannedMeal[] = [];
  for (const week of Object.values(data.plan)) for (const m of week) if (m.recipeId && m.date <= until && m.status !== 'omitida') meals.push(m);
  meals.sort((a, b) => b.date.localeCompare(a.date));
  for (const m of meals) {
    const prev = seen.get(m.recipeId!);
    if (prev) {
      prev.times++;
      continue;
    }
    const r = getRecipe(data, m.recipeId);
    if (r && !r.custom) seen.set(r.id, { recipe: r, date: m.date, slot: m.slot, status: m.status, times: 1 });
  }
  return [...seen.values()];
}

export interface Collection {
  id: string;
  title: string;
  subtitle: string;
  /** recetas de la colección, ya ordenadas */
  pick: (data: AppData, library: Recipe[]) => Recipe[];
}

const kcal = (data: AppData, r: Recipe) => recipeMacros(data, r).kcal;
const prot = (data: AppData, r: Recipe) => recipeMacros(data, r).protein;
/** Orden estable pero variado por día: las colecciones no muestran siempre las mismas primeras recetas. */
function dailyShuffle(list: Recipe[]): Recipe[] {
  const day = todayISO();
  const h = (s: string) => {
    let x = 2166136261;
    for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 16777619);
    return x >>> 0;
  };
  return [...list].sort((a, b) => h(a.id + day) - h(b.id + day));
}

/**
 * Colecciones de la biblioteca. Todas se calculan con datos reales de las recetas
 * (tiempo, categoría, cocina, nutrición, etiquetas): no hay valoraciones ni estadísticas
 * de comunidad porque la app no las tiene.
 */
export const COLLECTIONS: Collection[] = [
  {
    id: 'rapidas',
    title: 'Rápidas y deliciosas',
    subtitle: 'Comidas y cenas en 20 minutos o menos',
    pick: (_d, lib) => dailyShuffle(lib.filter((r) => (r.category === 'comida' || r.category === 'cena') && r.minutes <= 20)),
  },
  {
    id: 'desayunos',
    title: 'Desayunos para empezar bien',
    subtitle: 'Con proteína y algo de fruta, cereal o pan',
    pick: (d, lib) => dailyShuffle(lib.filter((r) => r.category === 'desayuno' && prot(d, r) >= 15)),
  },
  {
    id: 'cenas-faciles',
    title: 'Cenas sin complicaciones',
    subtitle: 'Fáciles, en 25 minutos y ligeras',
    pick: (d, lib) => dailyShuffle(lib.filter((r) => r.category === 'cena' && r.difficulty === 'facil' && r.minutes <= 25 && kcal(d, r) < 550)),
  },
  {
    id: 'proteina',
    title: 'Alto contenido proteico',
    subtitle: 'De más a menos proteína por ración',
    pick: (d, lib) => lib.filter((r) => r.tags.includes('alta_proteina')).sort((a, b) => prot(d, b) - prot(d, a)),
  },
  {
    id: 'mediterranea',
    title: 'Cocina mediterránea',
    subtitle: 'Recetas españolas y mediterráneas',
    pick: (_d, lib) => dailyShuffle(lib.filter((r) => (r.cuisine === 'espanola' || r.cuisine === 'mediterranea') && (r.category === 'comida' || r.category === 'cena'))),
  },
  {
    id: 'batch',
    title: 'Para preparar con antelación',
    subtitle: 'Aguantan en la nevera o se hacen en tanda',
    pick: (_d, lib) => dailyShuffle(lib.filter((r) => r.tags.includes('batch'))),
  },
  {
    id: 'antojos',
    title: 'Antojos inteligentes',
    subtitle: 'Dulces, meriendas y postres por debajo de 300 kcal',
    pick: (d, lib) => dailyShuffle(lib.filter((r) => r.tags.includes('dulce') && ['merienda', 'snack', 'postre'].includes(r.category) && kcal(d, r) < 300)),
  },
  {
    id: 'mundo',
    title: 'La vuelta al mundo',
    subtitle: 'Italiana, mexicana, asiática y más',
    pick: (_d, lib) => dailyShuffle(lib.filter((r) => r.cuisine && !['espanola', 'mediterranea'].includes(r.cuisine) && (r.category === 'comida' || r.category === 'cena'))),
  },
  {
    id: 'cuchara',
    title: 'De cuchara',
    subtitle: 'Guisos, legumbres, sopas y cremas',
    pick: (_d, lib) => dailyShuffle(lib.filter((r) => r.tags.includes('cuchara'))),
  },
];

/** Recetas de la biblioteca compatibles con el perfil, para colecciones personalizadas. */
export function compatibleLibrary(data: AppData): Recipe[] {
  return allRecipes(data).filter((r) => !r.custom && recipeFit(data, r, data.profile).ok);
}
