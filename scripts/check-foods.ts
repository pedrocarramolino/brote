/**
 * Comprobación de la base de alimentos y del buscador.
 * Uso: npm run check:foods
 */
import { BASE_FOODS, GENERIC_ALIAS, OFFICIAL_FOODS } from '../src/data/foods';
import { FoodIndex } from '../src/services/foodSearch';
import { RECIPE_LIBRARY } from '../src/data/recipeLibrary';
import { dishNutrition, toBaseAmount } from '../src/services/dishes';
import type { AppData, Food, PlannedMeal } from '../src/types';
import { LEGACY_PER100 } from '../src/data/foods';
import { baseProfile, createUserData } from '../src/data/demo';
import { migrateFoodDb } from '../src/services/history';
import { dayTotals, ingredientsNutrition, mealIngredients, plannedMealNutrition } from '../src/services/nutrition';
import { getFood } from '../src/services/catalog';
import { fmtQty, qtyFromBase, qtyToBase } from '../src/features/meals/QuantityEditor';

const problems: string[] = [];
const ok = (cond: boolean, msg: string, detail = '') => {
  console.log(`${cond ? '✓' : '✗'} ${msg}${detail ? ` — ${detail}` : ''}`);
  if (!cond) problems.push(msg);
};

const all = [...BASE_FOODS, ...OFFICIAL_FOODS];
const bySource = all.reduce<Record<string, number>>((a, f) => ((a[f.source] = (a[f.source] ?? 0) + 1), a), {});
const byGroup = all.reduce<Record<string, number>>((a, f) => ((a[f.group ?? '—'] = (a[f.group ?? '—'] ?? 0) + 1), a), {});
console.log(`Alimentos genéricos: ${all.length} (app ${BASE_FOODS.length} · catálogo BEDCA/USDA ${OFFICIAL_FOODS.length})`);
console.log('Por fuente:', bySource);
console.log('Por grupo:', byGroup);

// 1–3. cantidad, variedad y sin duplicados
ok(all.length >= 1000, 'Más de 1.000 alimentos genéricos', String(all.length));
const ids = new Set<string>();
for (const f of all) {
  if (ids.has(f.id)) problems.push(`id duplicado ${f.id}`);
  ids.add(f.id);
  if (!(f.per100.kcal >= 0 && f.per100.kcal <= 900)) problems.push(`${f.id}: energía fuera de rango`);
}
ok(problems.length === 0, 'Identificadores únicos y energía en rango');
const norm = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
const byName = new Map<string, string[]>();
for (const f of all) byName.set(norm(f.name), [...(byName.get(norm(f.name)) ?? []), f.id]);
const dupNames = [...byName].filter(([, v]) => v.length > 1);
ok(dupNames.length === 0, 'Un solo alimento por nombre (sin duplicados)', dupNames.map(([k, v]) => `${k}: ${v.join(', ')}`).join(' | '));
ok(Object.entries(GENERIC_ALIAS).every(([from, to]) => !ids.has(from) && ids.has(to)), 'Equivalentes agrupados bajo un genérico', Object.entries(GENERIC_ALIAS).map(([a, b]) => `${a}→${b}`).join(', '));
const count = (re: RegExp, foods = all) => foods.filter((f) => re.test(f.name)).length;
const variety: [string, RegExp, number][] = [
  ['leche', /^leche|bebida de/i, 10], ['queso', /queso|mozzarella|ricotta|cottage|parmesano|brie|cheddar|gouda|edam|emmental|gruy/i, 30],
  ['yogur', /yogur/i, 15], ['pollo', /pollo/i, 15], ['ternera/vacuno', /ternera|vacuno|vaca/i, 10], ['cerdo', /cerdo|lomo|jamón|panceta|costilla/i, 15],
  ['pescado', /merluza|salmón|atún|atun|bacalao|sardina|bonito|caballa|lenguado|rape|lubina|dorada|trucha/i, 30], ['marisco', /gamba|langost|mejill|almeja|calamar|pulpo|sepia|berberecho/i, 12],
  ['cereales/pasta/arroz', /arroz|pasta|espagueti|macarr|avena|quinoa|cuscús|harina/i, 30], ['pan', /^pan|tostad|tortitas/i, 15], ['legumbres', /garbanzo|lenteja|alubia|judía|guisante|soja|edamame/i, 20],
  ['frutos secos', /almendra|nuez|avellana|pistacho|anacardo|cacahuete|macadamia|pipa|semilla|chía|chia/i, 20], ['salsas', /mayonesa|kétchup|ketchup|mostaza|barbacoa|pesto|salsa|vinagre/i, 10],
];
for (const [label, re, min] of variety) ok(count(re) >= min, `Variedad de ${label}`, `${count(re)} (mínimo ${min})`);

// sin marcas comerciales
const BRAND_WORDS = /\b(hacendado|mercadona|carrefour|danone|pascual|central lechera|nestl[eé]|elpozo|campofr[ií]o|president|philadelphia|activia|actimel|kellogg|bimbo|isabel|calvo|alpro|oreo|nutella|cola ?cao|dia|eroski|lidl|aldi|alcampo|auchan|consum|bon[aà]rea|kraft|heinz|knorr|gallo|barilla|tulip[aá]n|flora|puleva|kaiku|asturiana|llet nostra|el caser[ií]o|garc[ií]a baquero|coren)\b/i;
const withBrand = all.filter((f) => f.brand || BRAND_WORDS.test(f.name.replace(/^Gallo \(pescado\)$/, '')));
ok(withBrand.length === 0, 'Ningún alimento con marca comercial', withBrand.slice(0, 8).map((f) => `${f.id} ${f.name}`).join(' | '));
const leches = ['Leche entera', 'Leche semidesnatada', 'Leche desnatada', 'Leche sin lactosa', 'Bebida de avena', 'Bebida de soja', 'Bebida de almendra'];
const lecheNames = all.map((f) => norm(f.name));
const missingV = leches.filter((v) => !lecheNames.some((n) => (v === 'Leche sin lactosa' ? /^leche .*sin lactosa/.test(n) : n.startsWith(norm(v)))));
ok(missingV.length === 0, 'Se conservan las variedades (entera, semidesnatada, desnatada, sin lactosa, bebidas vegetales)', missingV.length ? `faltan: ${missingV.join(', ')}` : leches.join(', '));
ok(RECIPE_LIBRARY.every((r) => r.ingredients.every((i) => getFood({ customFoods: [] }, i.foodId))), 'Todas las recetas encuentran sus alimentos', `${RECIPE_LIBRARY.length} recetas`);

// 4. fuentes fiables
const unofficial = BASE_FOODS.filter((f) => f.source === 'referencia');
ok(OFFICIAL_FOODS.every((f) => f.source === 'bedca' || f.source === 'usda'), 'Fuente declarada en cada alimento');
console.log(`  Alimentos de la app que conservan un valor estimado (sin equivalente fiable): ${unofficial.map((f) => f.id).join(', ')}`);

// 5. buscador
const idx = new FoodIndex();
idx.add(BASE_FOODS, 6);
idx.add(OFFICIAL_FOODS, 4);
const t0 = performance.now();
const leche = idx.search('leche', { limit: 60 });
const queso = idx.search('queso', { limit: 80 });
const ms = performance.now() - t0;
ok(leche.length >= 15 && leche.every((f) => !f.brand) && leche.slice(0, 5).some((f) => /semidesnatada/i.test(f.name)), 'Buscar «leche» da variedades genéricas, sin marcas', `${leche.length} resultados; ${leche.slice(0, 6).map((f) => f.name).join(' | ')}`);
const quesoNames = queso.map((f) => f.name.toLowerCase()).join(' ');
ok(['mozzarella', 'parmesano', 'manchego', 'cheddar', 'fresco'].every((k) => quesoNames.includes(k)), 'Buscar «queso» incluye mozzarella, parmesano, manchego, cheddar, fresco…', `${queso.length} resultados`);
const typo = idx.search('mozarela', { limit: 10 });
ok(typo.some((f) => /mozzarella/i.test(f.name)), 'Tolera faltas de ortografía («mozarela»)', typo[0]?.name);
const typo2 = idx.search('yogurt griego', { limit: 10 });
ok(typo2.some((f) => /yogur griego/i.test(f.name)), 'Sinónimos («yogurt griego»)', typo2[0]?.name);
const brandQ = ['hacendado', 'danone', 'pascual', 'carrefour'].flatMap((q) => idx.search(q, { limit: 20 })).filter((f) => f.brand || BRAND_WORDS.test(f.name));
ok(brandQ.length === 0, 'Buscar una marca no devuelve productos de marca', brandQ.map((f) => f.name).join(' | '));
const cat = idx.search('quesos', { limit: 50 });
ok(cat.length >= 30, 'Búsqueda por categoría («quesos», genéricos)', String(cat.length));
const lightG = idx.search('yogur griego', { limit: 40 }).map((f) => f.name);
ok(lightG.some((n) => /0 %|desnatad/i.test(n)) && lightG.some((n) => /entero/i.test(n)), 'Distingue yogur griego normal y ligero', lightG.slice(0, 4).join(' | '));
ok(ms < 150, 'Búsqueda rápida', `${ms.toFixed(1)} ms para dos búsquedas sobre ${idx.size} alimentos`);

// 6–7. creador de platos con alimentos nuevos
const manchego = BASE_FOODS.find((f) => f.id === 'manchego')!;
const conejo = BASE_FOODS.find((f) => f.id === 'conejo')!;
const leche_semi = BASE_FOODS.find((f) => /semidesnatada/i.test(f.name))!;
const n = dishNutrition({ customFoods: [] }, [{ foodId: 'manchego', quantity: 50, unit: 'g' }, { foodId: 'conejo', quantity: 200, unit: 'g' }, { foodId: leche_semi.id, quantity: 200, unit: 'ml' }], 2);
const expected = (manchego.per100.kcal * 50 + conejo.per100.kcal * 200 + leche_semi.per100.kcal * 200) / 100;
ok(Math.abs(n.total.kcal - expected) < 0.01 && Math.abs(n.perServing.kcal - expected / 2) < 0.01, 'Plato con alimentos genéricos bien calculado', `${n.total.kcal.toFixed(1)} kcal = ${expected.toFixed(1)}`);

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
  ok(Math.abs(logKcal - legacyLog) < 0.01 && Math.abs(mealKcal - legacyMeal) < 0.01 && d.foodDbVersion === 3,
    'Registros anteriores conservan sus valores tras pasar a datos oficiales',
    `pollo 150 g: ${legacyLog.toFixed(0)} kcal (con BEDCA/USDA serían ${((BASE_FOODS.find((f) => f.id === 'pollo')!.per100.kcal * 150) / 100).toFixed(0)}); comida hecha ${mealKcal.toFixed(0)} kcal; total antes de migrar ${before.toFixed(0)}`);
  // un registro nuevo guarda sus valores y no cambia si se corrige el alimento
  d.log.push({ id: 'l2', date: '2026-11-13', slot: 'comida', foodId: 'arroz', amount: 100, createdAt: '', method: 'manual', per100: { kcal: 999, protein: 0, carbs: 0, fat: 0 } });
  ok(Math.round(dayTotals(d, '2026-11-13').consumed.kcal) === 999, 'Un registro usa los valores guardados al anotarlo');
}

// ---------------------------------------------------------------------------
// Sin marcas: los productos de marca guardados antes pasan a su genérico (migración v3)
{
  const d: AppData = createUserData(baseProfile({ name: 'Con marcas' }));
  d.foodDbVersion = 2;
  const semi = getFood(d, 'leche')!;
  const brandedMilk: Food = { id: 'off_8480000123', name: 'Leche semidesnatada', brand: 'Marca Blanca', unit: 'ml', per100: { kcal: 46, protein: 3.1, carbs: 4.7, fat: 1.6 }, category: 'lacteos', source: 'openfoodfacts', allergens: ['lactosa'] };
  const brandedOdd: Food = { id: 'off_000999', name: 'Snack de algas sabor wasabi', brand: 'Rara', unit: 'g', per100: { kcal: 520, protein: 9, carbs: 40, fat: 36 }, category: 'otros', source: 'openfoodfacts', allergens: [] };
  d.customFoods = [brandedMilk, brandedOdd];
  d.customRecipes = [{
    id: 'dish_x', name: 'Mi tazón', title: 'Mi tazón', custom: true, slots: ['desayuno'], category: 'desayuno', main: 'lacteo', difficulty: 'facil', minutes: 2, servings: 1, tags: [], steps: [],
    ingredients: [{ foodId: brandedMilk.id, amount: 250 }, { foodId: 'avena', amount: 40 }, { foodId: 'u171269', amount: 10 }],
    dish: { items: [{ foodId: brandedMilk.id, quantity: 250, unit: 'ml' }, { foodId: 'avena', quantity: 40, unit: 'g' }, { foodId: 'u171269', quantity: 10, unit: 'ml' }] },
  } as unknown as AppData['customRecipes'][number]];
  d.favorites.foods = [brandedMilk.id, 'leche'];
  d.log = [{ id: 'lb', date: '2026-11-10', slot: 'desayuno', foodId: brandedMilk.id, amount: 200, createdAt: '', method: 'manual', per100: { ...brandedMilk.per100 } }];
  const doneMeal: PlannedMeal = { id: 'pmx', date: '2026-11-10', slot: 'desayuno', recipeId: 'dish_x', portion: 1, status: 'hecha' };
  d.plan = { '2026-11-09': [doneMeal] };
  const dayBefore = dayTotals(d, '2026-11-10').consumed.kcal;
  migrateFoodDb(d, '2026-11-13');
  const dish = d.customRecipes[0];
  ok(!d.customFoods.some((f) => f.id === brandedMilk.id) && dish.ingredients[0].foodId === semi.id && dish.dish!.items[0].foodId === semi.id && dish.ingredients[2].foodId === 'leche_desnatada',
    'Platos con productos de marca pasan al genérico', `${brandedMilk.name} (${brandedMilk.brand}) → ${semi.name}; u171269 → leche_desnatada`);
  ok(d.log[0].foodId === semi.id && d.favorites.foods.length === 1 && d.favorites.foods[0] === semi.id, 'Registros y favoritos apuntan al genérico');
  const odd = d.customFoods.find((f) => f.id === brandedOdd.id);
  ok(!!odd && !odd.brand && odd.source === 'usuario' && odd.per100.kcal === 520, 'Sin equivalente fiable: se conserva como alimento propio sin marca', odd?.name);
  ok(Math.abs(dayTotals(d, '2026-11-10').consumed.kcal - dayBefore) < 0.01, 'Lo ya comido no cambia al quitar las marcas', `${dayBefore.toFixed(1)} kcal`);
  const n2 = ingredientsNutrition(d, dish.ingredients);
  ok(n2.missing.length === 0 && n2.macros.kcal > 0, 'El plato sigue calculándose tras quitar las marcas', `${n2.macros.kcal.toFixed(0)} kcal`);
  ok(d.customFoods.every((f) => !f.brand), 'No queda ninguna marca en los datos del usuario');
}

// ---------------------------------------------------------------------------
// Edición de cantidades: unidades ⇄ gramos con las equivalencias de la base
{
  const f = (id: string) => getFood({ customFoods: [] }, id)!;
  const kiwi = f('kiwi'), huevo = f('huevo'), platano = f('platano'), pollo = f('pollo'), arroz = f('arroz'), leche = f('leche'), aceite = f('aceite');
  const kcal = (food: Food, g: number) => (food.per100.kcal * g) / 100;
  ok(toBaseAmount(kiwi, 1, 'unidad') === 75 && toBaseAmount(kiwi, 2, 'unidad') === 150 && toBaseAmount(kiwi, 0.5, 'unidad') === 37.5, 'Kiwi: 1 = 75 g, 2 = 150 g, ½ = 37,5 g');
  ok(qtyToBase(kiwi, { text: '1', unit: 'unidad' }) === 75 && qtyToBase(kiwi, { text: '0,5', unit: 'unidad' }) === 37.5, '2 kiwis → 1 kiwi', `${kcal(kiwi, 150).toFixed(0)} → ${kcal(kiwi, 75).toFixed(0)} kcal`);
  ok(qtyToBase(huevo, { text: '1', unit: 'unidad' }) === toBaseAmount(huevo, 1, 'unidad') && qtyToBase(huevo, { text: '2', unit: 'unidad' }) === 2 * toBaseAmount(huevo, 1, 'unidad')!, '2 huevos → 1 huevo', `${toBaseAmount(huevo, 2, 'unidad')} → ${toBaseAmount(huevo, 1, 'unidad')} g`);
  ok(qtyToBase(platano, { text: '0,5', unit: 'unidad' }) === toBaseAmount(platano, 1, 'unidad')! / 2, 'Medio plátano', `${qtyToBase(platano, { text: '0,5', unit: 'unidad' })} g · ${kcal(platano, qtyToBase(platano, { text: '0,5', unit: 'unidad' })!).toFixed(0)} kcal`);
  ok(qtyToBase(pollo, { text: '100', unit: 'g' }) === 100 && qtyToBase(arroz, { text: '60', unit: 'g' }) === 60 && qtyToBase(leche, { text: '150', unit: 'ml' }) === 150, 'Gramos y mililitros (pollo 100 g, arroz 60 g, leche 150 ml)');
  ok(qtyToBase(pollo, { text: '1', unit: 'unidad' }) === null || toBaseAmount(pollo, 1, 'unidad') !== null, 'Sin peso por unidad fiable no se inventa la equivalencia', `pollo por unidad: ${toBaseAmount(pollo, 1, 'unidad')}`);
  ok(toBaseAmount(leche, 1, 'g') === null && toBaseAmount(leche, 1, 'cucharada') === 15 && toBaseAmount(aceite, 1, 'cucharada') === 10, 'No se convierte ml ↔ g sin densidad; cucharada = 15 ml (o la de la base: aceite 10 g)');
  ok(qtyFromBase(kiwi, 150, 'unidad').text === '2' && qtyFromBase(kiwi, 150).text === '150' && fmtQty(37.5) === '37,5', 'Cambio entre unidades y gramos (150 g = 2 kiwis)');
  ok(qtyToBase(kiwi, { text: '', unit: 'unidad' }) === null && qtyToBase(kiwi, { text: '0', unit: 'unidad' }) === null && qtyToBase(kiwi, { text: 'abc', unit: 'unidad' }) === null, 'Cantidades vacías o no válidas no se guardan');

  // comida del plan: cambiar la cantidad de un ingrediente no toca la receta original
  const recipe = RECIPE_LIBRARY.find((r) => r.ingredients.length >= 3)!;
  const snapshotRecipe = JSON.stringify(recipe);
  const ing = recipe.ingredients[0];
  const d: AppData = createUserData(baseProfile({ name: 'Cantidades' }));
  const meal: PlannedMeal = { id: 'pm', date: '2026-11-13', slot: 'comida', recipeId: recipe.id, portion: 1, status: 'pendiente' };
  d.plan = { '2026-11-09': [meal] };
  const before = plannedMealNutrition(d, meal).macros!.kcal;
  meal.swaps = { [ing.foodId]: { foodId: ing.foodId, amount: ing.amount / 2 } };
  const after = plannedMealNutrition(d, meal).macros!.kcal;
  const expectedDiff = kcal(f(ing.foodId), ing.amount / 2);
  const row = mealIngredients(d, meal)[0];
  ok(Math.abs(before - after - expectedDiff) < 0.01 && row.original === ing.amount && !row.replaces, 'Cambiar la cantidad en una comida recalcula sus valores', `${recipe.id}: ${f(ing.foodId).name} ${ing.amount} → ${ing.amount / 2}; ${before.toFixed(0)} → ${after.toFixed(0)} kcal`);
  ok(JSON.stringify(RECIPE_LIBRARY.find((r) => r.id === recipe.id)) === snapshotRecipe, 'La receta original no cambia');
  const dayKcal = dayTotals(d, '2026-11-13');
  ok(Math.abs(dayKcal.planned.kcal - after) < 0.01, 'El total del día usa la cantidad consumida', `${dayKcal.planned.kcal.toFixed(0)} kcal`);
  // registro: 2 kiwis → 1 kiwi
  d.log = [{ id: 'k', date: '2026-11-13', slot: 'merienda', foodId: 'kiwi', amount: 150, quantity: 2, unit: 'unidad', createdAt: '', method: 'manual', per100: { ...kiwi.per100 } }];
  const k2 = dayTotals(d, '2026-11-13').consumed.kcal;
  Object.assign(d.log[0], { amount: 75, quantity: 1 });
  const k1 = dayTotals(d, '2026-11-13').consumed.kcal;
  ok(Math.abs(k2 - k1 - kcal(kiwi, 75)) < 0.01, 'Registro diario: 2 kiwis → 1 recalcula el día', `${k2.toFixed(0)} → ${k1.toFixed(0)} kcal`);
}

if (problems.length) {
  console.error(`\n${problems.length} problema(s):\n- ${problems.slice(0, 20).join('\n- ')}`);
  process.exit(1);
}
console.log('\nBase de alimentos correcta.');
