import type { Food } from '../types';
import { normalize } from '../lib/format';

/**
 * Buscador de alimentos genéricos: nombre, categoría (grupo) y variedad, con tolerancia a
 * pequeñas faltas de ortografía. Trabaja sobre un índice en memoria (~1.100 alimentos)
 * y devuelve resultados en milisegundos mientras se escribe. La base no contiene marcas.
 */

interface Entry {
  food: Food;
  name: string; // normalizado
  tokens: string[];
  group: string;
  /** prioridad base: alimentos de la app > tuyos > catálogo oficial */
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
   * Busca alimentos. Todas las palabras deben coincidir con el nombre o la categoría.
   * Orden: coincidencia exacta o al inicio del nombre, palabras completas, alimentos de la app
   * antes que el catálogo completo, y nombres más cortos (más genéricos) antes.
   */
  search(query: string, opts: { limit?: number } = {}): Food[] {
    const q = normalize(query.trim());
    const limit = opts.limit ?? 60;
    const pool = this.entries;
    if (!q) return pool.slice().sort((a, b) => b.weight - a.weight || a.name.localeCompare(b.name, 'es')).slice(0, limit).map((e) => e.food);
    const words = tokenize(q);
    if (!words.length) return [];
    const scored: { e: Entry; s: number }[] = [];
    for (const e of pool) {
      let total = 0;
      let ok = true;
      for (const w of words) {
        const alts = [w, ...(SYNONYMS[w] ?? [])];
        let s = 0;
        for (const a of alts) {
          s = Math.max(s, tokenScore(a, e.tokens));
          if (e.group && e.group.split(' ').some((g) => g.startsWith(a))) s = Math.max(s, 1.8);
        }
        if (!s) {
          ok = false;
          break;
        }
        total += s;
      }
      if (!ok) continue;
      if (e.name === q) total += 8;
      else if (e.name.startsWith(q)) total += 4;
      else if (e.name.includes(q)) total += 1.5;
      total += e.weight - e.name.length / 60;
      scored.push({ e, s: total });
    }
    return scored.sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.e.food);
  }
}

