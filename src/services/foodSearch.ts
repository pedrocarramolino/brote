import type { Food } from '../types';
import { normalize } from '../lib/format';

/**
 * Buscador de alimentos: nombre, marca, categoría (grupo) y variedad, con tolerancia a
 * pequeñas faltas de ortografía. Trabaja sobre un índice en memoria (unos miles de
 * registros) y devuelve resultados en milisegundos mientras se escribe.
 *
 * Los productos de marca (Open Food Facts) se cargan bajo demanda en un fragmento aparte
 * (`loadBranded`), para no penalizar el arranque de la app.
 */

export type FoodKind = 'generico' | 'marca';
export const kindOf = (f: Food): FoodKind => (f.brand ? 'marca' : 'generico');

interface Entry {
  food: Food;
  name: string; // normalizado
  tokens: string[];
  brand: string;
  group: string;
  /** prioridad base: alimentos de la app > oficiales > marcas */
  weight: number;
}

const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'sin', 'y', 'en', 'a', 'al', 'para', 'por', 'tipo', 's/e']);
const tokenize = (s: string) => normalize(s).split(/[^a-z0-9ñ%]+/).filter((t) => t && !STOP.has(t));

/** Sinónimos y variantes habituales al escribir. */
const SYNONYMS: Record<string, string[]> = {
  yogurt: ['yogur'], yoghurt: ['yogur'], yogures: ['yogur'], mozarella: ['mozzarella'], parmesan: ['parmesano'], jamon: ['jamon'],
  pechuga: ['pechuga'], atun: ['atun'], bebida: ['bebida', 'leche'], leches: ['leche'], quesos: ['queso'], huevos: ['huevo'],
  garbanzo: ['garbanzos', 'garbanzo'], lenteja: ['lentejas', 'lenteja'], alubia: ['alubias', 'alubia', 'judia'], judias: ['alubias', 'judia'],
  proteina: ['proteina', 'whey'], whey: ['proteina', 'suero'], vegana: ['vegetal', 'soja', 'avena', 'almendra'], light: ['light', 'ligero', 'ligera', 'bajo', '0%'],
  ligero: ['light', 'ligero', 'bajo'], desnatado: ['desnatado', 'desnatada', '0%'], semi: ['semidesnatado', 'semidesnatada'], 'sin-lactosa': ['lactosa'],
};

/** Distancia de edición (Damerau-Levenshtein restringida) con corte temprano. */
function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  const prev2 = new Array(b.length + 1).fill(0);
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
      cur.push(v);
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return max + 1;
    for (let j = 0; j <= b.length; j++) prev2[j] = prev[j];
    prev = cur;
  }
  return prev[b.length];
}

/** Puntuación de una palabra buscada frente a las palabras del alimento (0 = no coincide). */
function tokenScore(q: string, words: string[]): number {
  let best = 0;
  for (const w of words) {
    if (w === q) return 4;
    if (w.startsWith(q)) best = Math.max(best, q.length >= 3 ? 3 : 2);
    else if (q.length >= 4 && w.includes(q)) best = Math.max(best, 1.5);
    else if (q.length >= 4 && w.length >= 4) {
      const d = editDistance(q, w.slice(0, Math.max(q.length, Math.min(w.length, q.length + 1))), q.length >= 7 ? 2 : 1);
      if (d <= (q.length >= 7 ? 2 : 1)) best = Math.max(best, 1.2);
    }
  }
  return best;
}

export class FoodIndex {
  private entries: Entry[] = [];
  private ids = new Set<string>();

  add(foods: Food[], weight: number) {
    for (const f of foods) {
      if (this.ids.has(f.id)) continue;
      this.ids.add(f.id);
      const name = normalize(f.name);
      this.entries.push({
        food: f,
        name,
        tokens: tokenize(`${f.name} ${f.group ?? ''}`),
        brand: normalize(f.brand ?? ''),
        group: normalize(f.group ?? ''),
        weight,
      });
    }
  }

  get size() {
    return this.entries.length;
  }

  has(id: string) {
    return this.ids.has(id);
  }

  /**
   * Busca alimentos. Todas las palabras deben coincidir con el nombre, la marca o la categoría.
   * Orden: coincidencia exacta o al inicio del nombre, palabras completas, alimentos de la app
   * y genéricos antes que marcas, y nombres más cortos (más genéricos) antes.
   */
  search(query: string, opts: { kind?: FoodKind | 'todos'; limit?: number } = {}): Food[] {
    const q = normalize(query.trim());
    const limit = opts.limit ?? 60;
    const kind = opts.kind ?? 'todos';
    const pool = kind === 'todos' ? this.entries : this.entries.filter((e) => kindOf(e.food) === kind);
    if (!q) return pool.slice().sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name, 'es')).slice(0, limit).map((e) => e.food);
    const words = tokenize(q);
    if (!words.length) return [];
    const scored: { e: Entry; s: number }[] = [];
    for (const e of pool) {
      let total = 0;
      let ok = true;
      let brandHit = false;
      for (const w of words) {
        const alts = [w, ...(SYNONYMS[w] ?? [])];
        let s = 0;
        for (const a of alts) {
          s = Math.max(s, tokenScore(a, e.tokens));
          if (e.brand && a.length >= 3 && (e.brand === a || e.brand.startsWith(a) || e.brand.split(' ').some((b) => b.startsWith(a)))) {
            s = Math.max(s, 3.5);
            brandHit = true;
          }
          if (e.group && e.group.split(' ').some((g) => g.startsWith(a))) s = Math.max(s, 1.8);
        }
        if (!s) {
          ok = false;
          break;
        }
        total += s;
      }
      if (!ok) continue;
      // los productos de marca solo suben si se busca la marca: así «leche» o «queso» muestran
      // primero las variedades genéricas y después los productos comerciales
      const k = e.brand && !brandHit ? 0.5 : 1;
      // si se ha escrito la marca, el resto de palabras se compara con el nombre del producto
      const qName = brandHit ? words.filter((w) => !e.brand.split(' ').some((b) => b.startsWith(w))).join(' ') : q;
      if (qName && e.name === qName) total += 8 * k;
      else if (qName && e.name.startsWith(qName)) total += 4 * k;
      else if (qName && e.name.includes(qName)) total += 1.5 * k;
      total += e.weight - e.name.length / 60;
      scored.push({ e, s: total });
    }
    return scored.sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.e.food);
  }
}

/* ---------------- productos de marca (carga diferida) ---------------- */

type BrandedRow = { id: string; n: string; b: string; q?: string; u: 'g' | 'ml'; v: (number | null)[]; g: string; a: Food['allergens']; t: NonNullable<Food['tags']> };
const SHOP: Record<string, Food['category']> = {
  'Bebidas vegetales': 'lacteos', Quesos: 'lacteos', 'Lácteos': 'lacteos', Huevos: 'proteinas', 'Embutidos y fiambres': 'proteinas', Carnes: 'proteinas',
  Mariscos: 'proteinas', Pescados: 'proteinas', 'Aceites y grasas': 'conservas', Legumbres: 'conservas', 'Frutos secos y semillas': 'otros',
  'Pan y bollería': 'cereales', 'Cereales, pasta y arroz': 'cereales', Frutas: 'verduras', 'Verduras y hortalizas': 'verduras', Bebidas: 'otros',
  'Azúcares y dulces': 'otros', 'Salsas y condimentos': 'conservas', 'Platos preparados': 'otros', 'Proteína vegetal': 'proteinas', 'Proteína y suplementos': 'otros',
};
const nn = (x: number | null) => (x === null ? undefined : x);

export function brandedFood(r: BrandedRow): Food {
  const [kcal, protein, carbs, fat, sat, sugars, fiber, salt] = r.v;
  return {
    id: r.id,
    name: r.n,
    brand: r.b,
    quantity: r.q,
    unit: r.u,
    per100: { kcal: kcal ?? 0, protein: protein ?? 0, carbs: carbs ?? 0, fat: fat ?? 0 },
    fiber: nn(fiber),
    sat: nn(sat),
    sugars: nn(sugars),
    salt: nn(salt),
    category: SHOP[r.g] ?? 'otros',
    group: r.g,
    allergens: r.a,
    tags: r.t.length ? r.t : undefined,
    source: 'openfoodfacts',
    ref: `Código ${r.id.replace('off_', '')}`,
  };
}

let brandedPromise: Promise<Food[]> | null = null;
/** Carga (una sola vez) el catálogo de productos de marca. */
export function loadBranded(): Promise<Food[]> {
  brandedPromise ??= import('../data/foodDb/branded.json').then((m) => (m.default as unknown as BrandedRow[]).map(brandedFood));
  return brandedPromise;
}
