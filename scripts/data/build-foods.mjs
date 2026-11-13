/**
 * Construye la base de datos de alimentos de la app a partir de los datos brutos descargados.
 *
 *   node scripts/data/build-foods.mjs <dir-bedca-raw> <dir-usda-sr-csv> <off-raw.json>
 *
 * Genera en src/data/foodDb/:
 *   - official.json  alimentos genéricos de BEDCA (AESAN) y USDA FoodData Central (SR Legacy)
 *   - branded.json   productos de marca de supermercados españoles (Open Food Facts, ODbL)
 *   - report.json    recuento y motivos de exclusión (auditoría)
 *
 * Reglas: no se inventan valores. Un alimento necesita energía declarada; si falta algún
 * macronutriente se marca como incompleto. Se excluyen las entradas cuya energía no cuadra
 * con sus macronutrientes (control de Atwater) y las revisadas a mano (mapping.mjs).
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BASE_MAP, BASE_RENAME, CURATED_NEW, USDA_EXTRA, BEDCA_EXCLUDE } from './mapping.mjs';

const [BEDCA_DIR, USDA_DIR, OFF_FILE] = process.argv.slice(2);
if (!BEDCA_DIR || !USDA_DIR || !OFF_FILE) throw new Error('Uso: build-foods.mjs <bedca> <usda> <off.json>');
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'src', 'data', 'foodDb');
mkdirSync(OUT, { recursive: true });

const r1 = (x) => (x === null || x === undefined || !Number.isFinite(x) ? null : Math.round(x * 10) / 10);
const report = { bedca: { total: 0, kept: 0, excluded: [] }, usda: { kept: 0 }, off: { total: 0, kept: 0, reasons: {} } };

/** Atwater: ¿la energía declarada cuadra con los macronutrientes? */
function plausible(v) {
  const [kcal, p, c, f, , , fib, , alc = 0] = v;
  if (kcal === null) return false;
  if (p === null || c === null || f === null) return true; // incompleto: se marca, no se descarta
  const tol = Math.max(25, kcal * 0.25);
  // hidratos sin fibra (fibra a 2 kcal/g) o con la fibra incluida (especias y algunos productos)
  const sinFibra = 4 * p + 4 * c + 9 * f + 2 * (fib ?? 0) + 7 * alc;
  const conFibra = 4 * p + 4 * Math.max(0, c - (fib ?? 0)) + 9 * f + 2 * (fib ?? 0) + 7 * alc;
  const general = 4 * p + 4 * c + 9 * f + 7 * alc; // factores generales sin distinguir fibra
  return [sinFibra, conFibra, general].some((x) => Math.abs(x - kcal) <= tol);
}

/* ---------------- Grupos (subcategoría), sección de compra y alérgenos ---------------- */
const GROUP_RULES = [
  [/^(leche de almendra|leche de coco|bebida de soja|batido de soja|batido fermentado de soja|bebida de (avena|arroz|almendra|coco))/i, 'Bebidas vegetales'],
  [/^queso|^requesón|ricotta|cottage|mozzarella|^cuajada|cremoso/i, 'Quesos'],
  [/^(leche|yogur|kefir|petit|nata|batido lácteo|batido de (chocolate|fresa)|preparado lácteo|mousse de (yogur|queso))/i, 'Lácteos'],
  [/^huevo/i, 'Huevos'],
  [/jamón|lacón|chorizo|salchich|fuet|mortadela|salami|choped|sobrasada|morcilla|butifarra|chistorra|longaniza|lomo embuchado|cecina|fiambre|bacon|bacón|tocino|pate|paté|foie/i, 'Embutidos y fiambres'],
  [/^(pollo|pavo|ternera|vaca|vacuno|carne|cerdo|cordero|cabrito|conejo|liebre|pato|oca|perdiz|pichón|ciervo|avestruz|gallina|rabo|callos|corazón|corazon|hígado|higado|lengua|riñón|sesos|pulmón|molleja|kebab|san jacobo|flamenquín|croquetas de pollo|albondigas)/i, 'Carnes'],
  [/^(almeja|berberecho|bogavante|bígaro|calamar|camarón|cangrejo|caracol|centollo|chipiron|cigala|gamba|langost|mejill|nécora|ostra|percebe|pulpo|sepia|vieira|zamburiñ|chirla|surimi)/i, 'Mariscos'],
  [/^(anchoa|anguila|angula|arenque|atún|atun|bacaladilla|bacalao|besugo|bonito|boquerón|breca|caballa|cabracho|carpa|caviar|congrio|dorada|faneca|fletan|gallo|jurel|lenguado|lija|lubina|lucio|merluza|mero|mújol|palometa|panga|perca|pescadilla|pescado|pez espada|pijota|platija|rape|raya|rodaballo|salema|salmon|salmón|salmonete|sardina|sargo|tenca|trucha|vieja|volador)/i, 'Pescados'],
  [/^(aceite|manteca|mantequilla|margarina|grasa de)/i, 'Aceites y grasas'],
  [/^(alubia|garbanzo|guisante, seco|haba, seca|judía blanca|judía pinta|judías blancas|lenteja|soja|altramuz|chufa)/i, 'Legumbres'],
  [/^(almendra|avellana|cacahuete|castaña|coco, desecado|crema de almendras|crema de cacahuete|frutos secos|nuez|pipa|pistacho|piñon|piñón|anacardo|semilla|sésamo|pasta de sésamo)/i, 'Frutos secos y semillas'],
  [/^(pan|bocadillo|croissant|donut|ensaimada|magdalena|bollería|bizcocho|churro|napolitana|palmera|sobao|rosquilla|torta de aceite|hojaldre|masa de hojaldre|galleta|pastas de te|pastel|tostada)/i, 'Pan y bollería'],
  [/^(arroz|avena|cebada|centeno|trigo|maíz, en mazorca, crudo|mijo|quinoa|sémola|harina|pasta alimenticia|cereales|muesli|salvado|germen|gofio|tapioca|almidón|corteza de trigo|aperitivos de trigo|palomitas)/i, 'Cereales, pasta y arroz'],
  [/^(albaricoque|arandano|caqui|cereza|chirimoya|ciruela|coco, fresco|dátil|frambuesa|fresa|granada|grosella|guayaba|higos|kiwi|lima|litchi|macedonia|mandarina|mango|manzana|melocotón|melón|membrillo|nectarina|nispero|níspero|naranja|papaya|paraguaya|pera|piña|plátano|pomelo|sandía|uva|pasta de fruta)/i, 'Frutas'],
  [/^(zumo|néctar|refresco|agua|bebida|café|té|infusión|horchata|batido|limonada|soda|cerveza|vino|cava|sidra|sangría|vermut|licor|aguardiente|anís|coñac|ginebra|ron|tequila|vodka|whisky|cubata)/i, 'Bebidas'],
  [/^(azúcar|caramelo|chicle|bombón|chocolate|barra|barrita|cacao|confitura|mermelada|miel|jalea|regaliz|gominola|turrón|crema de chocolate|crema de cacao|fructosa|helado|natillas|flan|crema catalana|crema inglesa|crema pastelera|crema de vainilla|mousse de chocolate|gelatina|arroz con leche|pudding|leche merengada)/i, 'Azúcares y dulces'],
  [/^(alioli|ketchup|mayonesa|mojo|mostaza|salsa|sofrito|tabasco|tomate frito|vinagre|cubito|caldo|sal |sal$|pimentón|pimienta|curry|comino|canela|orégano|tomillo|romero|laurel|eneldo|nuez moscada|azafrán|vainilla|guindilla|gomasio)/i, 'Salsas y condimentos'],
  [/^(paella|fabada|lasaña|canelones|gazpacho|ensaladilla|empanad|pizza|rollito|sopa|puré|tortilla, a la francesa|menestra|ensalada$|albondigas en conserva)/i, 'Platos preparados'],
  [/^(seitán|tofu|miso|suplemento proteico|lecitina)/i, 'Proteína vegetal'],
];
const groupOf = (name) => GROUP_RULES.find(([re]) => re.test(name))?.[1] ?? 'Verduras y hortalizas';
const SHOP = {
  'Bebidas vegetales': 'lacteos', Quesos: 'lacteos', 'Lácteos': 'lacteos', Huevos: 'proteinas', 'Embutidos y fiambres': 'proteinas', Carnes: 'proteinas',
  Mariscos: 'proteinas', Pescados: 'proteinas', 'Aceites y grasas': 'conservas', Legumbres: 'conservas', 'Frutos secos y semillas': 'otros',
  'Pan y bollería': 'cereales', 'Cereales, pasta y arroz': 'cereales', Frutas: 'verduras', Bebidas: 'otros', 'Azúcares y dulces': 'otros',
  'Salsas y condimentos': 'conservas', 'Platos preparados': 'otros', 'Proteína vegetal': 'proteinas', 'Proteína y suplementos': 'otros', 'Verduras y hortalizas': 'verduras', Otros: 'otros',
};
function allergensOf(name, group) {
  const n = name.toLowerCase();
  const a = new Set();
  if (['Lácteos', 'Quesos'].includes(group) || /leche(?! de (almendra|coco|soja|avena|arroz))|nata|mantequilla|queso|yogur|chocolate con leche|chocolate blanco|bechamel|helado|natillas|flan|crema (catalana|inglesa|pastelera)|carbonara|roquefort/.test(n)) a.add('lactosa');
  if (/trigo|pan|pasta|harina(?! de (maíz|arroz|garbanzo|soja))|galleta|bizcocho|bollería|croissant|donut|magdalena|cereales|muesli|cuscús|bulgur|sémola|seitán|pizza|hojaldre|empanad|lasaña|canelones|churro|ensaimada|palmera|napolitana|cebada|centeno|avena|bocadillo|rebozad|empanado|san jacobo|flamenquín|croquetas|gofio|salvado|germen|cerveza/.test(n)) a.add('gluten');
  if (group === 'Huevos' || /huevo|mayonesa|alioli|flan|pasta alimenticia, con huevo|crema catalana|crema pastelera|tortilla, a la francesa/.test(n)) a.add('huevo');
  if (group === 'Pescados' || /surimi|caviar/.test(n)) a.add('pescado');
  if (group === 'Mariscos') a.add('marisco');
  if (/almendra|nuez|nueces|avellana|pistacho|anacardo|piñ[oó]n|macadamia/.test(n)) a.add('frutos_secos');
  if (/cacahuete/.test(n)) a.add('cacahuete');
  if (/soja|tofu|miso|tempeh|edamame|lecitina/.test(n)) a.add('soja');
  if (/sésamo|tahini|hummus|gomasio/.test(n)) a.add('sesamo');
  if (/apio/.test(n)) a.add('apio');
  if (/mostaza/.test(n)) a.add('mostaza');
  if (/vino|vinagre|uva pasa|orejones|sidra|cava|vermut/.test(n)) a.add('sulfitos');
  return [...a];
}
function tagsOf(group, name) {
  const t = new Set();
  if (['Carnes', 'Embutidos y fiambres'].includes(group)) ['animal', 'carne'].forEach((x) => t.add(x));
  if (['Pescados', 'Mariscos'].includes(group)) ['animal', 'pescado'].forEach((x) => t.add(x));
  if (['Lácteos', 'Quesos'].includes(group) || /mantequilla|nata|chocolate con leche|chocolate blanco|bechamel/i.test(name)) ['animal', 'lacteo'].forEach((x) => t.add(x));
  if (group === 'Huevos' || /mayonesa|alioli/i.test(name)) ['animal', 'huevo'].forEach((x) => t.add(x));
  if (/miel|jalea real|gelatina|caldo de pollo|caldo de pescado|manteca|grasa de pollo/i.test(name)) t.add('animal');
  if (/caldo de pollo|grasa de pollo|manteca/i.test(name)) t.add('carne');
  return [...t];
}

/* ---------------- BEDCA ---------------- */
const official = new Map(); // id → fila
for (const file of readdirSync(BEDCA_DIR).filter((f) => /^\d+\.json$/.test(f))) {
  const d = JSON.parse(readFileSync(join(BEDCA_DIR, file), 'utf8'));
  report.bedca.total++;
  const g = (k) => d.values[k]?.value ?? null;
  const name = d.name.replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
  const kj = g('409');
  const na = g('323'); // mg
  const v = [r1(kj !== null ? kj / 4.184 : null), r1(g('416')), r1(g('53')), r1(g('410')), r1(g('299')), r1(g('446')), r1(g('307')), r1(na !== null ? (na * 2.5) / 1000 : null), r1(g('404'))];
  if (BEDCA_EXCLUDE[d.id]) { report.bedca.excluded.push([d.id, name, BEDCA_EXCLUDE[d.id]]); continue; }
  if (v[0] === null) { report.bedca.excluded.push([d.id, name, 'sin energía declarada']); continue; }
  if (!plausible(v)) { report.bedca.excluded.push([d.id, name, `energía (${v[0]} kcal) incoherente con sus macronutrientes`]); continue; }
  const group = groupOf(name);
  official.set(`b${d.id}`, { id: `b${d.id}`, n: name, u: 'g', v: v.slice(0, 8), g: group, s: 'bedca', r: Number(d.id), a: allergensOf(name, group), t: tagsOf(group, name) });
  report.bedca.kept++;
}

/* ---------------- USDA SR Legacy ---------------- */
const csvRows = (file) => {
  const text = readFileSync(join(USDA_DIR, file), 'utf8');
  const lines = text.split(/\r?\n/).filter(Boolean);
  const parse = (l) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).map((x) => x.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'));
  const head = parse(lines[0]);
  return lines.slice(1).map((l) => Object.fromEntries(parse(l).map((x, i) => [head[i], x])));
};
const usdaIds = new Set([...USDA_EXTRA.map((x) => String(x[0])), ...Object.values(BASE_MAP).filter((x) => x?.startsWith('u:')).map((x) => x.slice(2)), ...CURATED_NEW.map((x) => x[2]).filter((x) => x.startsWith('u:')).map((x) => x.slice(2))]);
const NUT = { 1008: 0, 1003: 1, 1005: 2, 1004: 3, 1258: 4, 2000: 5, 1079: 6, 1093: 7 };
const usdaVals = new Map();
for (const r of csvRows('food_nutrient.csv')) {
  if (!usdaIds.has(r.fdc_id) || !(r.nutrient_id in NUT)) continue;
  const arr = usdaVals.get(r.fdc_id) ?? Array(8).fill(null);
  let val = Number(r.amount);
  if (r.nutrient_id === '1093') val = (val * 2.5) / 1000; // sodio mg → sal g
  arr[NUT[r.nutrient_id]] = r1(val);
  usdaVals.set(r.fdc_id, arr);
}
const usdaDesc = new Map(csvRows('food.csv').filter((r) => usdaIds.has(r.fdc_id)).map((r) => [r.fdc_id, r.description]));
for (const [fdc, name, group, unit] of USDA_EXTRA) {
  const v = usdaVals.get(String(fdc));
  if (!v || v[0] === null) throw new Error(`USDA ${fdc} sin datos`);
  // USDA usa factores de energía específicos por alimento (p. ej. cacao): solo se avisa
  if (!plausible(v)) (report.usda.warnings ??= []).push([fdc, name, 'energía calculada por USDA con factores específicos']);
  official.set(`u${fdc}`, { id: `u${fdc}`, n: name, u: unit, v, g: group, s: 'usda', r: fdc, en: usdaDesc.get(String(fdc)), a: allergensOf(name, group), t: tagsOf(group, name) });
  report.usda.kept++;
}
// los usados por alimentos base/curados aunque no estén en USDA_EXTRA
for (const ref of [...Object.values(BASE_MAP), ...CURATED_NEW.map((x) => x[2])]) {
  if (!ref?.startsWith('u:')) continue;
  const fdc = ref.slice(2);
  if (official.has(`u${fdc}`)) continue;
  const v = usdaVals.get(fdc);
  if (!v || v[0] === null) throw new Error(`USDA ${fdc} sin datos`);
  official.set(`u${fdc}`, { id: `u${fdc}`, n: usdaDesc.get(fdc), u: 'g', v, g: 'Otros', s: 'usda', r: Number(fdc), hidden: true, a: [], t: [] });
}
for (const ref of [...Object.values(BASE_MAP), ...CURATED_NEW.map((x) => x[2])]) {
  if (!ref) continue;
  const id = ref.replace(':', '');
  if (!official.has(id)) (report.missingRefs ??= []).push(ref);
}
if (report.missingRefs) {
  const ex = Object.fromEntries(report.bedca.excluded.map((e) => [`b:${e[0]}`, `${e[1]} — ${e[2]}`]));
  console.error('Referencias no disponibles:\n' + report.missingRefs.map((r) => `  ${r}: ${ex[r] ?? '?'}`).join('\n'));
  process.exit(1);
}

/* ---------------- Open Food Facts (marcas) ---------------- */
const OFF_GROUP = [
  [/plant-based-milks|non-dairy-milk|soy-milks|almond-milks|oat-milks|rice-milks|coconut-milks/, 'Bebidas vegetales'],
  [/cheeses/, 'Quesos'], [/yogurts|milks|dairies|fermented-milk|creams|desserts-lacteos|dairy-desserts|kefir/, 'Lácteos'],
  [/hams|sausages|salamis|chorizos|cold-cuts|cured-meats|bacons|pates|prepared-meats/, 'Embutidos y fiambres'],
  [/meats|poultries|chickens|turkeys|beef|porks/, 'Carnes'], [/seafood|shrimps|mussels|clams|squids|octopus|crustaceans|molluscs/, 'Mariscos'],
  [/fishes|tunas|sardines|salmons|anchovies|fish-preserves|canned-fish/, 'Pescados'], [/eggs/, 'Huevos'],
  [/olive-oils|vegetable-oils|oils|fats|butters|margarines/, 'Aceites y grasas'], [/legumes|pulses|chickpeas|lentils|beans/, 'Legumbres'],
  [/nuts|seeds|peanut-butters|nut-butters/, 'Frutos secos y semillas'], [/breads|toasts|biscuits|cookies|pastries|viennoiseries|cakes|crackers|rusks/, 'Pan y bollería'],
  [/breakfast-cereals|cereals|pastas|rices|flours|grains|mueslis|granolas|rice-cakes|corn-cakes/, 'Cereales, pasta y arroz'],
  [/fruits|fruit-preserves|compotes/, 'Frutas'], [/vegetables|salads|mushrooms|tomatoes|potatoes/, 'Verduras y hortalizas'],
  [/beverages|drinks|juices|waters|sodas|coffees|teas/, 'Bebidas'], [/sweets|chocolates|cocoa|confectioneries|jams|honeys|sugars|spreads|ice-creams|desserts/, 'Azúcares y dulces'],
  [/sauces|condiments|mayonnaises|ketchups|mustards|dressings|vinegars|broths|soups|spices|hummus/, 'Salsas y condimentos'],
  [/meals|pizzas|prepared|ready-meals|lasagnas|sandwiches|tortillas-de-patatas/, 'Platos preparados'],
  [/protein-powders|dietary-supplements|sports-nutrition|protein-bars/, 'Proteína y suplementos'], [/tofu|tempeh|meat-alternatives|plant-based-foods/, 'Proteína vegetal'],
];
const ALLERGEN_OFF = { 'en:milk': 'lactosa', 'en:gluten': 'gluten', 'en:eggs': 'huevo', 'en:fish': 'pescado', 'en:crustaceans': 'marisco', 'en:molluscs': 'marisco', 'en:nuts': 'frutos_secos', 'en:peanuts': 'cacahuete', 'en:soybeans': 'soja', 'en:sesame-seeds': 'sesamo', 'en:celery': 'apio', 'en:mustard': 'mostaza', 'en:sulphur-dioxide-and-sulphites': 'sulfitos' };
const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim();
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const titleBrand = (b) => b.split(/\s+/).map((w) => cap(w.toLowerCase())).join(' ');
/** Variantes del mismo nombre de marca en Open Food Facts */
const BRAND_ALIAS = [[/^d[ií]a( retail.*)?$/i, 'Dia'], [/^consum( s\. ?coop.*)?$/i, 'Consum'], [/^bon[aà]rea$/i, 'bonÀrea'], [/^carrefour( bio| discount| classic)?$/i, (m) => titleBrand(m)], [/^auchan$/i, 'Auchan (Alcampo)'], [/^alcampo$/i, 'Alcampo'], [/^nestl[eé]$/i, 'Nestlé'], [/^central lechera asturiana$/i, 'Central Lechera Asturiana'], [/^el ?pozo$/i, 'ElPozo'], [/^campofr[ií]o$/i, 'Campofrío'], [/^pr[eé]sident$/i, 'Président']];
const normBrand = (b) => {
  for (const [re, to] of BRAND_ALIAS) if (re.test(b)) return typeof to === 'function' ? to(b) : to;
  return titleBrand(b);
};
const off = JSON.parse(readFileSync(OFF_FILE, 'utf8'));
const branded = [];
const seen = new Set();
const why = (k) => (report.off.reasons[k] = (report.off.reasons[k] ?? 0) + 1);
for (const p of Object.values(off)) {
  report.off.total++;
  const n = p.nutriments ?? {};
  const num = (k) => (typeof n[k] === 'number' ? n[k] : typeof n[k] === 'string' && n[k] !== '' ? Number(n[k]) : null);
  let kcal = num('energy-kcal_100g');
  if (kcal === null && num('energy-kj_100g') !== null) kcal = num('energy-kj_100g') / 4.184;
  const v = [r1(kcal), r1(num('proteins_100g')), r1(num('carbohydrates_100g')), r1(num('fat_100g')), r1(num('saturated-fat_100g')), r1(num('sugars_100g')), r1(num('fiber_100g')), r1(num('salt_100g'))];
  const name = clean(p.product_name_es) || (p.lang === 'es' ? clean(p.product_name) : '');
  if (!name || name.length < 3) { why('sin nombre en español'); continue; }
  if (v.slice(0, 4).some((x) => x === null || x < 0)) { why('tabla nutricional incompleta'); continue; }
  if (v[0] > 900 || v[1] + v[2] + v[3] > 105 || (v[4] ?? 0) > v[3] + 0.5 || (v[5] ?? 0) > v[2] + 0.5) { why('valores imposibles'); continue; }
  if (!plausible(v)) { why('energía incoherente con macronutrientes'); continue; }
  const brand = normBrand(clean((p.brands ?? '').split(',')[0]));
  if (!brand) { why('sin marca'); continue; }
  const key = `${name.toLowerCase()}|${brand.toLowerCase()}|${v[0]}`;
  if (seen.has(key)) { why('duplicado'); continue; }
  seen.add(key);
  const cats = (p.categories_tags ?? []).join(' ');
  const group = OFF_GROUP.find(([re]) => re.test(cats))?.[1] ?? groupOf(name);
  // bebidas: las etiquetas europeas las declaran por 100 ml aunque OFF no indique el envase
  const liquid = /^(leche(?! (en polvo|condensada|evaporada))|bebida|zumo|néctar|nectar|refresco|agua|batido|kéfir|kefir|caldo|horchata|gazpacho|salmorejo)/i.test(name) || (/yogur líquido|para beber/i.test(name));
  const per = p.nutrition_data_per === '100ml' || liquid || (/\d\s*(ml|cl|l)\b/i.test(p.quantity ?? '') && /aceite|vinagre|salsa de soja/i.test(name)) ? 'ml' : 'g';
  const al = [...new Set((p.allergens_tags ?? []).map((x) => ALLERGEN_OFF[x]).filter(Boolean))];
  const t = tagsOf(group, name);
  if (al.includes('lactosa') && !t.includes('lacteo') && group !== 'Bebidas vegetales') { t.push('animal', 'lacteo'); }
  branded.push({ id: `off_${p.code}`, n: cap(name).slice(0, 90), b: brand, q: clean(p.quantity).slice(0, 20) || undefined, u: per, v, g: group, a: al, t: [...new Set(t)] });
  report.off.kept++;
}
branded.sort((a, b) => a.b.localeCompare(b.b, 'es') || a.n.localeCompare(b.n, 'es'));

/* ---------------- salida ---------------- */
const officialArr = [...official.values()].sort((a, b) => a.n.localeCompare(b.n, 'es'));
writeFileSync(join(OUT, 'official.json'), JSON.stringify(officialArr));
// enlace de los alimentos de la app con su dato oficial (lo lee src/data/foods.ts)
const asId = (ref) => (ref ? ref.replace(':', '') : null);
writeFileSync(join(OUT, 'curated.json'), JSON.stringify({
  base: Object.fromEntries(Object.entries(BASE_MAP).map(([k, v]) => [k, asId(v)])),
  rename: BASE_RENAME,
  added: CURATED_NEW.map(([id, name, ref, unit, cat, al, portion, tags]) => ({ id, name, ref: asId(ref), unit, cat, al, portion, tags })),
}));
writeFileSync(join(OUT, 'branded.json'), JSON.stringify(branded));
report.counts = { official: officialArr.length, visibleOfficial: officialArr.filter((x) => !x.hidden).length, branded: branded.length, brands: new Set(branded.map((x) => x.b)).size };
report.groups = Object.fromEntries(Object.entries(officialArr.concat(branded).reduce((a, x) => ((a[x.g] = (a[x.g] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]));
report.topBrands = Object.entries(branded.reduce((a, x) => ((a[x.b] = (a[x.b] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]).slice(0, 40);
writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report.counts), '\nBEDCA', report.bedca.kept, '/', report.bedca.total, 'excluidos', report.bedca.excluded.length, '\nOFF', report.off.kept, '/', report.off.total, report.off.reasons);
