import type { AppData, Food } from '../types';
import { normalize } from '../lib/format';
import { allFoods } from './catalog';

/**
 * Proveedores de datos de alimentos. La búsqueda local siempre está disponible;
 * Open Food Facts es opcional y solo se consulta si el usuario lo activa en Perfil,
 * porque implica enviar el término de búsqueda a un servicio externo.
 */
export interface FoodProvider {
  id: 'local' | 'openfoodfacts';
  search(query: string, signal?: AbortSignal): Promise<Food[]>;
}

export function searchLocal(data: AppData, query: string): Food[] {
  const q = normalize(query.trim());
  const foods = allFoods(data);
  if (!q) return foods;
  const words = q.split(/\s+/);
  return foods
    .map((f) => {
      const name = normalize(f.name);
      let score = 0;
      if (name.startsWith(q)) score += 3;
      if (name.includes(q)) score += 2;
      if (words.every((w) => name.includes(w))) score += 1;
      return { f, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.f.name.localeCompare(b.f.name, 'es'))
    .map((x) => x.f);
}

interface OFFProduct {
  code?: string;
  product_name?: string;
  product_name_es?: string;
  brands?: string;
  nutriments?: Record<string, number | string | undefined>;
}

const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN);

export const openFoodFactsProvider: FoodProvider = {
  id: 'openfoodfacts',
  async search(query, signal) {
    const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
    url.search = new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '12',
      lc: 'es',
      cc: 'es',
      fields: 'code,product_name,product_name_es,brands,nutriments',
    }).toString();
    const res = await fetch(url.toString(), { signal });
    if (!res.ok) throw new Error(`Open Food Facts respondió ${res.status}`);
    const json = (await res.json()) as { products?: OFFProduct[] };
    const out: Food[] = [];
    for (const p of json.products ?? []) {
      const n = p.nutriments ?? {};
      const kcal = num(n['energy-kcal_100g']);
      const protein = num(n['proteins_100g']);
      const carbs = num(n['carbohydrates_100g']);
      const fat = num(n['fat_100g']);
      const name = (p.product_name_es || p.product_name || '').trim();
      // Solo se aceptan productos con los cuatro valores declarados: no se rellenan huecos.
      if (!name || !p.code || [kcal, protein, carbs, fat].some((v) => !Number.isFinite(v))) continue;
      out.push({
        id: `off_${p.code}`,
        name,
        brand: p.brands?.split(',')[0]?.trim(),
        unit: 'g',
        per100: { kcal, protein, carbs, fat },
        category: 'otros',
        source: 'openfoodfacts',
        allergens: [],
      });
    }
    return out;
  },
};

export const SOURCE_LABEL: Record<Food['source'], string> = {
  bedca: 'BEDCA (AESAN)',
  usda: 'USDA FoodData Central',
  referencia: 'Valor estimado',
  usuario: 'Introducido por ti',
  openfoodfacts: 'Etiqueta · Open Food Facts',
  estimacion: 'Estimación',
};
