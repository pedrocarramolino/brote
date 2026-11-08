import type { Recipe, RecipeTag } from '../../types';
import { BASE_FOODS } from '../foods';
import { LEGACY_RECIPES } from '../recipes';
import { finalize } from './build';
import { DESAYUNOS } from './desayunos';
import { COMIDAS } from './comidas';
import { CENAS } from './cenas';
import { MEDIA_MANANA, MERIENDAS, POSTRES, SNACKS } from './ligeras';

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
  return [...tags];
}

export const RECIPE_LIBRARY: Recipe[] = [...LEGACY_RECIPES, ...DESAYUNOS, ...MEDIA_MANANA, ...COMIDAS, ...MERIENDAS, ...CENAS, ...SNACKS, ...POSTRES]
  .map(finalize)
  .map((r) => ({ ...r, tags: autoTags(r) }));

// Comprobaciones de integridad al cargar (fallan en desarrollo si hay datos incoherentes)
{
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const r of RECIPE_LIBRARY) {
    if (ids.has(r.id)) throw new Error(`Receta duplicada: ${r.id}`);
    const n = r.name.toLowerCase();
    if (names.has(n)) throw new Error(`Nombre de receta duplicado: ${r.name}`);
    ids.add(r.id);
    names.add(n);
  }
}
