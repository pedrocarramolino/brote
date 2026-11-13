/**
 * Comprobación de la base de alimentos y del buscador.
 * Uso: npm run check:foods
 */
import { readFileSync } from 'node:fs';
import { BASE_FOODS, OFFICIAL_FOODS } from '../src/data/foods';
import { FoodIndex, brandedFood, kindOf } from '../src/services/foodSearch';
import { RECIPE_LIBRARY } from '../src/data/recipeLibrary';
import { dishNutrition } from '../src/services/dishes';
import type { AppData, Food } from '../src/types';
import { LEGACY_PER100 } from '../src/data/foods';
import { baseProfile, createUserData } from '../src/data/demo';
import { migrateFoodDb } from '../src/services/history';
import { dayTotals, plannedMealNutrition } from '../src/services/nutrition';

const problems: string[] = [];
const ok = (cond: boolean, msg: string, detail = '') => {
  console.log(`${cond ? '✓' : '✗'} ${msg}${detail ? ` — ${detail}` : ''}`);
  if (!cond) problems.push(msg);
};

const branded: Food[] = JSON.parse(readFileSync('src/data/foodDb/branded.json', 'utf8')).map(brandedFood);
const all = [...BASE_FOODS, ...OFFICIAL_FOODS, ...branded];
const bySource = all.reduce<Record<string, number>>((a, f) => ((a[f.source] = (a[f.source] ?? 0) + 1), a), {});
const byGroup = all.reduce<Record<string, number>>((a, f) => ((a[f.group ?? '—'] = (a[f.group ?? '—'] ?? 0) + 1), a), {});
const brands = new Set(branded.map((f) => f.brand));
console.log(`Alimentos: ${all.length} (app ${BASE_FOODS.length} · catálogo oficial ${OFFICIAL_FOODS.length} · marcas ${branded.length} de ${brands.size} marcas)`);
console.log('Por fuente:', bySource);
console.log('Por grupo:', byGroup);

// 1–3. cantidad, variedad y distinción genérico/marca
ok(all.length >= 3000, 'Más de 3.000 alimentos', String(all.length));
const ids = new Set<string>();
for (const f of all) {
  if (ids.has(f.id)) problems.push(`id duplicado ${f.id}`);
  ids.add(f.id);
  if (!(f.per100.kcal >= 0 && f.per100.kcal <= 900)) problems.push(`${f.id}: energía fuera de rango`);
}
ok(problems.length === 0, 'Identificadores únicos y energía en rango');
const count = (re: RegExp, foods = all) => foods.filter((f) => re.test(f.name)).length;
const variety: [string, RegExp, number][] = [
  ['leche', /^leche|bebida de/i, 25], ['queso', /queso|mozzarella|ricotta|cottage|parmesano|brie|cheddar|gouda|edam|emmental|gruy/i, 60],
  ['yogur', /yogur/i, 40], ['pollo', /pollo/i, 15], ['ternera/vacuno', /ternera|vacuno|vaca/i, 10], ['cerdo', /cerdo|lomo|jamón|panceta|costilla/i, 15],
  ['pescado', /merluza|salmón|atún|atun|bacalao|sardina|bonito|caballa|lenguado|rape|lubina|dorada|trucha/i, 30], ['marisco', /gamba|langost|mejill|almeja|calamar|pulpo|sepia|berberecho/i, 12],
  ['cereales/pasta/arroz', /arroz|pasta|espagueti|macarr|avena|quinoa|cuscús|harina/i, 40], ['pan', /^pan|tostad|tortitas/i, 25], ['legumbres', /garbanzo|lenteja|alubia|judía|guisante|soja|edamame/i, 20],
  ['frutos secos', /almendra|nuez|avellana|pistacho|anacardo|cacahuete|macadamia|pipa|semilla|chía|chia/i, 20], ['salsas', /mayonesa|kétchup|ketchup|mostaza|barbacoa|pesto|salsa|vinagre/i, 20],
];
for (const [label, re, min] of variety) ok(count(re) >= min, `Variedad de ${label}`, `${count(re)} (mínimo ${min})`);
ok(branded.every((f) => kindOf(f) === 'marca' && !!f.brand) && [...BASE_FOODS, ...OFFICIAL_FOODS].every((f) => kindOf(f) === 'generico'), 'Genéricos y marcas diferenciados');
ok(['Hacendado', 'Carrefour', 'Danone', 'Pascual', 'Central Lechera Asturiana', 'Nestlé', 'ElPozo', 'Campofrío'].filter((b) => brands.has(b)).length >= 6, 'Marcas habituales presentes', [...brands].slice(0, 12).join(', '));

// 4. fuentes fiables
const unofficial = BASE_FOODS.filter((f) => f.source === 'referencia');
ok(OFFICIAL_FOODS.every((f) => f.source === 'bedca' || f.source === 'usda') && branded.every((f) => f.source === 'openfoodfacts'), 'Fuente declarada en cada alimento');
console.log(`  Alimentos de la app que conservan un valor estimado (sin equivalente fiable): ${unofficial.map((f) => f.id).join(', ')}`);

// 5. buscador
const idx = new FoodIndex();
idx.add(BASE_FOODS, 6);
idx.add(OFFICIAL_FOODS, 4);
idx.add(branded, 0);
const t0 = performance.now();
const leche = idx.search('leche', { limit: 60 });
const queso = idx.search('queso', { limit: 80 });
const ms = performance.now() - t0;
ok(leche.length >= 30 && !leche[0].brand && leche.slice(0, 5).some((f) => /semidesnatada/i.test(f.name)) && leche.some((f) => f.brand), 'Buscar «leche» da variedades y marcas', `${leche.length} resultados; ${leche.slice(0, 5).map((f) => f.name + (f.brand ? ` (${f.brand})` : '')).join(' | ')}`);
const quesoNames = queso.map((f) => f.name.toLowerCase()).join(' ');
ok(['mozzarella', 'parmesano', 'manchego', 'cheddar', 'fresco'].every((k) => quesoNames.includes(k)), 'Buscar «queso» incluye mozzarella, parmesano, manchego, cheddar, fresco…', `${queso.length} resultados`);
const typo = idx.search('mozarela', { limit: 10 });
ok(typo.some((f) => /mozzarella/i.test(f.name)), 'Tolera faltas de ortografía («mozarela»)', typo[0]?.name);
const typo2 = idx.search('yogurt griego', { limit: 10 });
ok(typo2.some((f) => /yogur griego/i.test(f.name)), 'Sinónimos («yogurt griego»)', typo2[0]?.name);
const brand = idx.search('hacendado leche', { limit: 20 });
ok(brand.length > 0 && brand.every((f) => f.brand === 'Hacendado'), 'Búsqueda por marca («hacendado leche»)', `${brand.length}: ${brand.slice(0, 3).map((f) => f.name).join(' | ')}`);
const cat = idx.search('quesos', { kind: 'generico', limit: 50 });
ok(cat.length >= 30, 'Búsqueda por categoría («quesos», genéricos)', String(cat.length));
const lightG = idx.search('yogur griego', { limit: 40 }).map((f) => f.name);
ok(lightG.some((n) => /0 %|desnatad/i.test(n)) && lightG.some((n) => /entero/i.test(n)), 'Distingue yogur griego normal y ligero', lightG.slice(0, 4).join(' | '));
ok(ms < 150, 'Búsqueda rápida', `${ms.toFixed(1)} ms para dos búsquedas sobre ${idx.size} alimentos`);

// 6–7. creador de platos con alimentos nuevos
const manchego = BASE_FOODS.find((f) => f.id === 'manchego')!;
const conejo = BASE_FOODS.find((f) => f.id === 'conejo')!;
const brandedMilk = leche.find((f) => f.brand)!;
const data = { customFoods: [brandedMilk] };
const n = dishNutrition(data, [{ foodId: 'manchego', quantity: 50, unit: 'g' }, { foodId: 'conejo', quantity: 200, unit: 'g' }, { foodId: brandedMilk.id, quantity: 200, unit: brandedMilk.unit }], 2);
const expected = (manchego.per100.kcal * 50 + conejo.per100.kcal * 200 + brandedMilk.per100.kcal * 200) / 100;
ok(Math.abs(n.total.kcal - expected) < 0.01 && Math.abs(n.perServing.kcal - expected / 2) < 0.01, 'Plato con alimentos nuevos (BEDCA + marca) bien calculado', `${n.total.kcal.toFixed(1)} kcal = ${expected.toFixed(1)}; ${brandedMilk.name} (${brandedMilk.brand})`);

// 9. recetas que usan los alimentos nuevos
const newIds = new Set(BASE_FOODS.filter((f) => !['referencia'].includes(f.source)).map((f) => f.id));
const addedIds = new Set(['manchego', 'cheddar', 'gouda', 'brie', 'roquefort', 'cabrales', 'provolone', 'ricotta', 'cottage', 'conejo', 'cordero_pierna', 'chuletas_cordero', 'costillas_cerdo', 'chorizo', 'lacon', 'jamon_iberico', 'lenguado', 'besugo', 'rodaballo', 'berberechos', 'zamburinas', 'vieiras', 'huevo_codorniz', 'proteina_whey', 'bebida_arroz', 'lentejas_secas', 'garbanzos_secos']);
const usingNew = RECIPE_LIBRARY.filter((r) => r.ingredients.some((i) => addedIds.has(i.foodId)));
ok(usingNew.length >= 60, 'Recetas que usan los alimentos incorporados', `${usingNew.length} recetas`);
const official = RECIPE_LIBRARY.filter((r) => r.ingredients.every((i) => newIds.has(i.foodId)));
console.log(`  Recetas calculadas al 100 % con datos de BEDCA/USDA: ${official.length} de ${RECIPE_LIBRARY.length}`);

// 14. registros anteriores: el cambio a datos oficiales no altera lo ya comido
{
  const d: AppData = createUserData(baseProfile({ name: 'Antiguo' }));
  delete d.foodDbVersion; // datos guardados con la base anterior
  d.plan = { '2026-11-02': [{ id: 'pm1', date: '2026-11-03', slot: 'comida', recipeId: 'pollo-boniato', portion: 1, status: 'hecha' }] };
  d.log = [{ id: 'l1', date: '2026-11-03', slot: 'cena', foodId: 'pollo', amount: 150, createdAt: '', method: 'manual' }];
  const legacyLog = (LEGACY_PER100.pollo.kcal * 150) / 100;
  const legacyMeal = RECIPE_LIBRARY.find((r) => r.id === 'pollo-boniato')!.ingredients.reduce((a, i) => a + ((LEGACY_PER100[i.foodId]?.kcal ?? 0) * i.amount) / 100, 0);
  const before = dayTotals(d, '2026-11-03').consumed.kcal; // sin migrar: ya usaría valores nuevos
  migrateFoodDb(d, '2026-11-13');
  const logKcal = dayTotals(d, '2026-11-03').consumed.kcal - plannedMealNutrition(d, d.plan['2026-11-02'][0]).macros!.kcal;
  const mealKcal = plannedMealNutrition(d, d.plan['2026-11-02'][0]).macros!.kcal;
  ok(Math.abs(logKcal - legacyLog) < 0.01 && Math.abs(mealKcal - legacyMeal) < 0.01 && d.foodDbVersion === 2,
    'Registros anteriores conservan sus valores tras pasar a datos oficiales',
    `pollo 150 g: ${legacyLog.toFixed(0)} kcal (con BEDCA/USDA serían ${((BASE_FOODS.find((f) => f.id === 'pollo')!.per100.kcal * 150) / 100).toFixed(0)}); comida hecha ${mealKcal.toFixed(0)} kcal; total antes de migrar ${before.toFixed(0)}`);
  // un registro nuevo guarda sus valores y no cambia si se corrige el alimento
  d.log.push({ id: 'l2', date: '2026-11-13', slot: 'comida', foodId: 'arroz', amount: 100, createdAt: '', method: 'manual', per100: { kcal: 999, protein: 0, carbs: 0, fat: 0 } });
  ok(Math.round(dayTotals(d, '2026-11-13').consumed.kcal) === 999, 'Un registro usa los valores guardados al anotarlo');
}

if (problems.length) {
  console.error(`\n${problems.length} problema(s):\n- ${problems.slice(0, 20).join('\n- ')}`);
  process.exit(1);
}
console.log('\nBase de alimentos correcta.');
