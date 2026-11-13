import type { Recipe, RecipeTag } from '../../types';
import { BASE_FOODS } from '../foods';
import { LEGACY_RECIPES } from '../recipes';
import { finalize } from './build';
import { DESAYUNOS } from './desayunos';
import { COMIDAS } from './comidas';
import { CENAS } from './cenas';
import { MEDIA_MANANA, MERIENDAS, POSTRES, SNACKS } from './ligeras';
import { DESAYUNOS_V3 } from './v3/desayunos';
import { COMIDAS_V3 } from './v3/comidas';
import { CENAS_V3 } from './v3/cenas';
import { MEDIA_MANANA_V3, MERIENDAS_V3, POSTRES_V3, SNACKS_V3 } from './v3/ligeras';
import { DESAYUNOS_V4, MEDIA_MANANA_V4, MERIENDAS_V4, POSTRES_V4, SNACKS_V4 } from './v4/ligeras';
import { CENAS_V4, COMIDAS_V4 } from './v4/principales';
import { HAMBURGUESAS_CENA, HAMBURGUESAS_COMIDA } from './v4/hamburguesas';

const foods = new Map(BASE_FOODS.map((f) => [f.id, f]));

/** Etiquetas que se deducen de los datos (no se escriben a mano para que no se contradigan). */
function autoTags(r: Recipe): RecipeTag[] {
  let kcal = 0;
  let protein = 0;
  for (const i of r.ingredients) {
    const f = foods.get(i.foodId);
    if (!f) continue;
    kcal += (f.per100.kcal * i.amount) / 100;
    protein += (f.per100.protein * i.amount) / 100;
  }
  const main = r.category === 'comida' || r.category === 'cena';
  const tags = new Set<RecipeTag>(r.tags);
  if (protein >= (main ? 30 : 18)) tags.add('alta_proteina');
  else tags.delete('alta_proteina');
  if (r.minutes <= 15) tags.add('rapida');
  if (main && kcal < 420) tags.add('ligera');
  if (r.cuisine && !['espanola', 'mediterranea'].includes(r.cuisine)) tags.add('internacional');
  else tags.delete('internacional');
  return [...tags];
}

export const RECIPE_LIBRARY: Recipe[] = [
  ...LEGACY_RECIPES, ...DESAYUNOS, ...MEDIA_MANANA, ...COMIDAS, ...MERIENDAS, ...CENAS, ...SNACKS, ...POSTRES,
  ...DESAYUNOS_V3, ...MEDIA_MANANA_V3, ...COMIDAS_V3, ...MERIENDAS_V3, ...CENAS_V3, ...SNACKS_V3, ...POSTRES_V3,
  ...DESAYUNOS_V4, ...MEDIA_MANANA_V4, ...COMIDAS_V4, ...HAMBURGUESAS_COMIDA, ...MERIENDAS_V4, ...CENAS_V4, ...HAMBURGUESAS_CENA, ...SNACKS_V4, ...POSTRES_V4,
]
  .map(finalize)
  .map((r) => ({ ...r, tags: autoTags(r) }));

// Comprobaciones de integridad al cargar (fallan en desarrollo si hay datos incoherentes)
{
  const ids = new Set<string>();
  const names = new Set<string>();
  const titles = new Set<string>();
  for (const r of RECIPE_LIBRARY) {
    if (ids.has(r.id)) throw new Error(`Receta duplicada: ${r.id}`);
    const n = r.name.toLowerCase();
    if (names.has(n)) throw new Error(`Nombre de receta duplicado: ${r.name}`);
    const t = (r.title ?? '').toLowerCase();
    if (titles.has(t)) throw new Error(`Nombre comercial duplicado: ${r.title}`);
    ids.add(r.id);
    names.add(n);
    titles.add(t);
  }
}
