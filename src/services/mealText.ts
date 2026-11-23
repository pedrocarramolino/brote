import type { AppData, Food, Recipe } from '../types';
import { normalize } from '../lib/format';
import { FoodIndex } from './foodSearch';
import { allRecipes } from './catalog';
import { unitSize } from './dishes';

/**
 * Interpreta lo que alguien escribe que ha comido («un puñado de almendras y una cerveza»,
 * «2 galletas», «200 ml de zumo», «una ración de croquetas») y lo convierte en alimentos de la
 * base con su cantidad. Las calorías y macros salen SIEMPRE de los valores por 100 g/ml de la
 * base: aquí solo se decide qué alimento es y cuánto. Si la cantidad no se dice, se usa la ración
 * de la base o una medida casera habitual (una lata 330 ml, una copa 150 ml…), y se indica
 * que es estimada para que el usuario la ajuste.
 */

export interface ParsedItem {
  /** trozo del texto al que corresponde */
  text: string;
  /** alimento elegido (el más probable); `alternatives` permite cambiarlo */
  food?: Food;
  /** plato de la biblioteca o propio, si encaja mejor que un alimento */
  recipe?: Recipe;
  /** g/ml del alimento, o raciones si es un plato */
  amount: number;
  /** cómo se ha obtenido la cantidad: «1 puñado», «2 unidades», «200 ml», «ración habitual» */
  amountNote: string;
  /** la cantidad no venía en el texto */
  estimated: boolean;
  alternatives: Food[];
}

const NUM_WORDS: Record<string, number> = {
  un: 1, una: 1, uno: 1, unos: 2, unas: 2, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  medio: 0.5, media: 0.5, par: 2, mitad: 0.5, cuarto: 0.25,
};

/** Medidas caseras (g o ml por medida). `drink` solo se aplica a bebidas. */
const MEASURES: Record<string, { g: number; drink?: number; label: string }> = {
  punado: { g: 25, label: 'puñado' },
  vaso: { g: 200, label: 'vaso' },
  taza: { g: 200, label: 'taza' },
  copa: { g: 150, label: 'copa' },
  cana: { g: 200, label: 'caña' },
  tercio: { g: 330, label: 'tercio' },
  botellin: { g: 250, label: 'botellín' },
  jarra: { g: 500, label: 'jarra' },
  lata: { g: 60, drink: 330, label: 'lata' },
  bolsa: { g: 40, label: 'bolsa' },
  bolsita: { g: 25, label: 'bolsita' },
  cucharada: { g: 15, label: 'cucharada' },
  cucharadita: { g: 5, label: 'cucharadita' },
  rebanada: { g: 30, label: 'rebanada' },
  loncha: { g: 20, label: 'loncha' },
  onza: { g: 10, label: 'onza' },
  trozo: { g: 30, label: 'trozo' },
  porcion: { g: 0, label: 'porción' },
  racion: { g: 0, label: 'ración' },
  tarrina: { g: 100, label: 'tarrina' },
  bola: { g: 60, label: 'bola' },
  bol: { g: 250, label: 'bol' },
  plato: { g: 250, label: 'plato' },
  pieza: { g: 0, label: 'pieza' },
  unidad: { g: 0, label: 'unidad' },
  tapa: { g: 0, label: 'tapa' },
  pincho: { g: 0, label: 'pincho' },
};
const MEASURE_ALIASES: Record<string, string> = { canas: 'cana', copas: 'copa', vasos: 'vaso', tazas: 'taza', latas: 'lata', bolsas: 'bolsa', punados: 'punado', cucharadas: 'cucharada', cucharaditas: 'cucharadita', rebanadas: 'rebanada', lonchas: 'loncha', onzas: 'onza', trozos: 'trozo', porciones: 'porcion', raciones: 'racion', bolas: 'bola', platos: 'plato', piezas: 'pieza', unidades: 'unidad', tercios: 'tercio', botellines: 'botellin', jarras: 'jarra', tarrinas: 'tarrina', tapas: 'tapa', pinchos: 'pincho', bolsitas: 'bolsita' };

/** Ración habitual y peso de una pieza para alimentos sin ración en la base (medidas caseras). */
const HOUSEHOLD: [RegExp, { serving: number; piece?: number; note: string }][] = [
  [/cerveza/, { serving: 330, piece: 330, note: 'lata o tercio' }],
  [/vino|cava|sidra/, { serving: 150, piece: 150, note: 'copa' }],
  [/refresco|tonica|gaseosa/, { serving: 330, piece: 330, note: 'lata' }],
  [/zumo|batido|horchata/, { serving: 200, piece: 200, note: 'vaso' }],
  [/cafe|infusion|\bte\b/, { serving: 200, piece: 200, note: 'taza' }],
  [/chips|patatas, fritas|patata frita/, { serving: 40, note: 'bolsa pequeña' }],
  [/galleta/, { serving: 28, piece: 7, note: '4 galletas' }],
  [/croissant|cruasan/, { serving: 60, piece: 60, note: 'unidad' }],
  [/magdalena|muffin/, { serving: 30, piece: 30, note: 'unidad' }],
  [/donut|berlina|napolitana|palmera/, { serving: 60, piece: 60, note: 'unidad' }],
  [/churro|porra/, { serving: 80, piece: 20, note: '4 churros' }],
  [/croqueta/, { serving: 90, piece: 30, note: '3 croquetas' }],
  [/gominola|caramelo|golosina/, { serving: 30, piece: 4, note: 'bolsita' }],
  [/helado/, { serving: 100, piece: 100, note: 'tarrina' }],
  [/palomitas/, { serving: 30, note: 'bol' }],
  [/barrita/, { serving: 25, piece: 25, note: 'unidad' }],
  [/turron|polvoron|mantecado/, { serving: 30, piece: 30, note: 'porción' }],
  [/bocadillo|sandwich|bocata/, { serving: 180, piece: 180, note: 'unidad' }],
  [/pizza/, { serving: 120, piece: 120, note: 'porción' }],
  [/empanad/, { serving: 120, piece: 120, note: 'porción' }],
  [/tarta|bizcocho|pastel/, { serving: 80, piece: 80, note: 'porción' }],
  [/aceituna/, { serving: 30, piece: 4, note: '8 aceitunas' }],
  [/nuez|nueces|almendra|avellana|anacardo|pistacho|cacahuete|pipas|frutos secos|macadamia/, { serving: 25, note: 'puñado' }],
  [/queso/, { serving: 30, note: 'porción' }],
  [/jamon|chorizo|salchichon|fuet|lomo embuchado/, { serving: 30, note: 'porción' }],
  [/chocolate/, { serving: 20, piece: 10, note: '2 onzas' }],
  [/yogur/, { serving: 125, piece: 125, note: 'unidad' }],
  [/pan/, { serving: 40, note: 'rebanada' }],
];

/** Palabras que se cambian antes de buscar (así se dice en la calle). */
const SAY: [RegExp, string][] = [
  [/\bcoca[\s-]?colas?\b|\bcocacolas?\b|\bcola\b/g, 'refresco sabor cola'],
  [/\b(birras?|canas?|tercios?|botellines?|jarras?)\b(?!\s+de)/g, 'cerveza'],
  [/\btinto\b(?! de verano)/g, 'vino tinto'],
  [/\bblanco\b(?=$)/g, 'vino blanco'],
  [/\bchips\b|\bpatatas de bolsa\b|\bpatatillas\b/g, 'patatas fritas chips'],
  [/\bcruasan(es)?\b/g, 'croissant'],
  [/\bgominolas?\b|\bchuches?\b|\bgolosinas?\b/g, 'gominola'],
  [/\bfrutos secos\b/g, 'almendras'],
];

const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'lo', 'al', 'algo', 'poco', 'poquito', 'mi', 'me', 'he', 'comido', 'tomado', 'bebido', 'picado', 'unos', 'unas', 'un', 'una', 'uno', 'par', 'muy', 'grande', 'pequeno', 'pequena', 'pequenos', 'pequenas', 'mediano', 'mediana']);

const singular = (w: string) => (w.endsWith('es') && w.length > 5 ? w.slice(0, -2) : w.endsWith('s') && w.length > 4 ? w.slice(0, -1) : w);
const isDrink = (f: Food) => f.unit === 'ml' || /cerveza|vino|refresco|zumo|leche|bebida|cafe|agua|batido|cava|sidra|tonica|horchata|infusion/.test(normalize(f.name));

/** Índice con todo lo que se puede registrar: alimentos de la app, catálogo y alimentos propios. */
export function buildIndex(foods: { base: Food[]; official: Food[]; custom: Food[] }): FoodIndex {
  const idx = new FoodIndex();
  idx.add(foods.base, 6);
  idx.add(foods.custom, 5);
  idx.add(foods.official, 4);
  return idx;
}

function household(f: Food) {
  const n = normalize(f.name);
  return HOUSEHOLD.find(([re]) => re.test(n))?.[1];
}

/** Divide el texto en lo que parece un alimento por trozo. */
export function splitMealText(text: string): string[] {
  return normalize(text)
    .replace(/\s+(y|e|mas|\+)\s+/g, ',')
    .split(/[,;\n+]|\s\+\s/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

export function parseMealText(data: Pick<AppData, 'customFoods' | 'customRecipes'>, text: string, index: FoodIndex): ParsedItem[] {
  const out: ParsedItem[] = [];
  for (const chunk of splitMealText(text)) {
    let rest = ` ${chunk} `;
    // cantidad explícita en g/ml
    let explicit: number | null = null;
    let explicitUnit = '';
    const m = rest.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilos?|gr|g|gramos?|ml|mililitros?|cl|l|litros?)\b/);
    if (m) {
      const v = Number(m[1].replace(',', '.'));
      const u = m[2];
      explicit = /^kg|kilo/.test(u) ? v * 1000 : u === 'cl' ? v * 10 : /^l$|litro/.test(u) ? v * 1000 : v;
      explicitUnit = /^(ml|mililitro|cl|l$|litro)/.test(u) ? 'ml' : 'g';
      rest = rest.replace(m[0], ' ');
    }
    // número de piezas o medidas
    let count = 1;
    let counted = false;
    const num = rest.match(/\s(\d+(?:[.,]\d+)?)\s/);
    if (num) { count = Number(num[1].replace(',', '.')); counted = true; rest = rest.replace(num[0], ' '); }
    else {
      for (const w of rest.trim().split(/\s+/)) {
        if (NUM_WORDS[w] !== undefined && !/^(unos|unas|un|una|uno)$/.test(w)) { count = NUM_WORDS[w]; counted = true; rest = rest.replace(` ${w} `, ' '); break; }
        if (/^(un|una|uno)$/.test(w)) { counted = true; break; }
      }
      if (/\bmedi[oa]\b/.test(rest)) { count = 0.5; counted = true; rest = rest.replace(/\bmedi[oa]\b/, ' '); }
    }
    let measure: string | null = null;
    for (const w of rest.trim().split(/\s+/)) {
      const key = MEASURE_ALIASES[w] ?? w;
      if (MEASURES[key]) { measure = key; rest = rest.replace(new RegExp(`\\b${w}\\b`), ' '); break; }
    }
    // palabras del alimento
    let q = rest;
    for (const [re, to] of SAY) q = q.replace(re, to);
    const words = q.trim().split(/\s+/).filter((w) => w && !STOP.has(w) && !NUM_WORDS[w]);
    // «una caña», «dos tercios»: la medida ya dice qué es
    const BY_MEASURE: Record<string, string> = { cana: 'cerveza', tercio: 'cerveza', botellin: 'cerveza', jarra: 'cerveza' };
    const query = words.join(' ') || (measure ? BY_MEASURE[measure] ?? '' : '');
    if (!query) continue;
    let results = index.search(query, { limit: 5 });
    if (!results.length) results = index.search(words.map(singular).join(' '), { limit: 5 });
    const exact = results.length > 0;
    // «bocadillo de jamón» sin coincidencia exacta: se prueba con menos palabras (lo principal va primero)
    for (let k = words.length - 1; !results.length && k >= 1; k--) results = index.search(words.slice(0, k).join(' '), { limit: 5 });
    // un plato (de la biblioteca o propio) cuyo nombre lleva todas las palabras: «tortilla de patata»
    const stems = words.map((w) => singular(w).slice(0, Math.max(4, singular(w).length - 1)));
    const has = (name: string) => { const n = normalize(name); return stems.every((st) => n.includes(st)); };
    const recipe = words.length >= 2 && !(exact && has(results[0].name))
      ? [...data.customRecipes, ...allRecipes(data)]
          .filter((r) => has(r.title ?? '') || has(r.name))
          // primero los platos propios, luego el título y el nombre más corto (lo más parecido a lo escrito)
          .sort((a, b) => Number(!!b.custom) - Number(!!a.custom) || Number(has(b.title ?? '')) - Number(has(a.title ?? '')) || a.name.length - b.name.length)[0]
      : undefined;
    if (recipe) {
      const servings = measure === 'racion' || measure === 'porcion' || measure === 'plato' || counted ? count : 1;
      out.push({ text: chunk, recipe, amount: servings, amountNote: `${servings === 1 ? '1 ración' : `${String(servings).replace('.', ',')} raciones`}`, estimated: !counted && !measure, alternatives: [] });
      continue;
    }
    const food = results[0];
    if (!food) { out.push({ text: chunk, amount: 0, amountNote: '', estimated: true, alternatives: [] }); continue; }
    const h = household(food);
    const piece = unitSize(food) ?? h?.piece ?? null;
    let amount: number;
    let note: string;
    let estimated = false;
    if (explicit !== null) {
      amount = explicit;
      note = `${String(Math.round(explicit * 10) / 10).replace('.', ',')} ${explicitUnit || food.unit}`;
    } else if (measure) {
      const ms = MEASURES[measure];
      const portionHasMeasure = food.portion && normalize(food.portion.label).includes(measure.slice(0, 4));
      const perMeasure = portionHasMeasure
        ? food.portion!.amount / (Number(food.portion!.label.match(/^(\d+)/)?.[1] ?? 1) || 1)
        : measure === 'racion' || measure === 'porcion' || measure === 'tapa' || measure === 'plato'
          ? (food.portion?.amount ?? h?.serving ?? (ms.g || 100))
          : ms.g === 0 ? (piece ?? food.portion?.amount ?? h?.serving ?? 100) : isDrink(food) && ms.drink ? ms.drink : ms.g;
      amount = perMeasure * count;
      note = `${count === 0.5 ? 'media' : String(count).replace('.', ',')} ${ms.label}${count > 1 ? 's' : ''}`;
      estimated = true;
    } else if (counted && piece) {
      amount = piece * count;
      const fromHousehold = !unitSize(food) && h?.piece;
      note = fromHousehold && count === 1 ? h!.note : `${String(count).replace('.', ',')} ${count === 1 ? 'unidad' : 'unidades'}`;
      estimated = true;
    } else {
      // ración de cuchara (p. ej. pipas, 1 cucharada) frente a lo que se pica: un puñado
      const spoon = /cuchar/.test(food.portion?.label ?? '');
      const serving = (spoon && h ? h.serving : food.portion?.amount) ?? h?.serving ?? (isDrink(food) ? 200 : 100);
      amount = serving * (counted ? count : 1);
      note = food.portion && !(spoon && h) ? food.portion.label : h ? h.note : 'ración habitual';
      estimated = true;
    }
    out.push({ text: chunk, food, amount: Math.round(amount * 10) / 10, amountNote: note, estimated, alternatives: results.slice(1, 5) });
  }
  return out;
}
