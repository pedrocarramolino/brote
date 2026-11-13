/**
 * Comprobación de la biblioteca de recetas y del planificador.
 * Uso: npm run check:library
 */
import { RECIPE_LIBRARY } from '../src/data/recipeLibrary';
import { BASE_FOODS } from '../src/data/foods';
import { baseProfile, createUserData } from '../src/data/demo';
import { acceptWeek, candidatesFor, generateWeek, regenerateDay, regenerateWeek } from '../src/services/planner';
import { buildShoppingList } from '../src/services/shopping';
import { dayTotals, mealIngredients, plannedMealNutrition } from '../src/services/nutrition';
import { foodMacros } from '../src/services/nutrition';
import { FoodIndex } from '../src/services/foodSearch';
import { OFFICIAL_FOODS } from '../src/data/foods';
const recipeTitleOf = (id: string | null) => { const r = RECIPE_LIBRARY.find((x) => x.id === id); return r?.title ?? r?.name; };
import { addDays, startOfWeek } from '../src/lib/dates';
import type { AppData, UserProfile } from '../src/types';

const foods = new Map(BASE_FOODS.map((f) => [f.id, f]));
const problems: string[] = [];
const warn: string[] = [];

const RANGE: Record<string, [number, number]> = {
  desayuno: [180, 700], mediamanana: [80, 380], comida: [300, 950], cena: [220, 800], merienda: [100, 480], snack: [40, 330], postre: [80, 420],
};
const byCat: Record<string, number> = {};
const cuisines: Record<string, number> = {};
const mains: Record<string, number> = {};

for (const r of RECIPE_LIBRARY) {
  byCat[r.category] = (byCat[r.category] ?? 0) + 1;
  cuisines[r.cuisine ?? '—'] = (cuisines[r.cuisine ?? '—'] ?? 0) + 1;
  mains[r.main] = (mains[r.main] ?? 0) + 1;
  if (!r.title || r.title.length < 4) problems.push(`${r.id}: sin nombre comercial`);
  if (r.title && r.title.length > 32) warn.push(`${r.id}: nombre comercial largo (${r.title.length}): ${r.title}`);
  if (!r.cuisine) problems.push(`${r.id}: sin cocina`);
  if (r.name.length < 12) warn.push(`${r.id}: descripción corta «${r.name}»`);
  if (!r.steps.length || r.steps.some((s) => s.length < 8)) problems.push(`${r.id}: pasos incompletos`);
  if (!r.ingredients.length) problems.push(`${r.id}: sin ingredientes`);
  if (!(r.servings >= 1)) problems.push(`${r.id}: raciones no válidas`);
  if (!(r.minutes > 0)) problems.push(`${r.id}: tiempo no válido`);
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  for (const i of r.ingredients) {
    const f = foods.get(i.foodId);
    if (!f) { problems.push(`${r.id}: alimento ${i.foodId} no existe`); continue; }
    if (i.amount > 450) warn.push(`${r.id}: ${i.foodId} ${i.amount} g por ración`);
    kcal += f.per100.kcal * i.amount / 100; protein += f.per100.protein * i.amount / 100;
    carbs += f.per100.carbs * i.amount / 100; fat += f.per100.fat * i.amount / 100;
  }
  const atw = protein * 4 + carbs * 4 + fat * 9;
  if (Math.abs(atw - kcal) / Math.max(kcal, 1) > 0.25 && kcal > 60) warn.push(`${r.id}: kcal ${kcal.toFixed(0)} vs Atwater ${atw.toFixed(0)}`);
  const [lo, hi] = RANGE[r.category];
  if (kcal < lo || kcal > hi) warn.push(`${r.id} (${r.category}): ${kcal.toFixed(0)} kcal por ración fuera de [${lo}, ${hi}]`);
}

console.log(`Recetas: ${RECIPE_LIBRARY.length}`);
console.log('Por categoría:', byCat);
console.log('Por cocina:', cuisines);
console.log('Por ingrediente principal:', mains);
if (warn.length) console.log(`\nAvisos (${warn.length}):\n- ` + warn.join('\n- '));
/* ---------------- Simulación del planificador ---------------- */
function simulate(label: string, profile: Partial<UserProfile>, weeks = 8) {
  const data: AppData = createUserData(baseProfile({ name: 'Prueba', targets: { kcal: 2000 }, ...profile }));
  let monday = startOfWeek('2026-01-05');
  data.plan = {};
  let inWeek = 0, in4 = 0, consecutive = 0, total = 0, mains = 0;
  const pools = Object.fromEntries(data.profile.mealSlots.map((sl) => [sl, candidatesFor(data, sl).length]));
  // con al menos 35 recetas por franja (7 días × 5 semanas) no debería repetirse nada en 4 semanas
  const mainPool = new Set([...candidatesFor(data, 'comida'), ...candidatesFor(data, 'cena')].map((r) => r.id)).size;
  // margen: además de no repetir, el menú alterna proteínas y ajusta calorías, así que hace falta algo más que el mínimo teórico (35)
  const enough = Object.values(pools).every((n) => n >= 45) && mainPool >= 90;
  const kinds: Record<string, number> = {};
  for (let w = 0; w < weeks; w++, monday = addDays(monday, 7)) {
    const meals = generateWeek(data, monday);
    data.plan[monday] = meals;
    const ids = meals.map((m) => m.recipeId!);
    inWeek += ids.length - new Set(ids).size;
    const prev = new Set<string>();
    for (let k = 1; k <= 4; k++) for (const m of data.plan[addDays(monday, -7 * k)] ?? []) prev.add(m.recipeId!);
    in4 += ids.filter((id) => prev.has(id)).length;
    total += ids.length;
    const seq = meals.filter((m) => m.slot === 'comida' || m.slot === 'cena').map((m) => RECIPE_LIBRARY.find((r) => r.id === m.recipeId)!.main);
    mains += seq.length;
    seq.forEach((k) => (kinds[k] = (kinds[k] ?? 0) + 1));
    for (let i = 1; i < seq.length; i++) if (seq[i] === seq[i - 1]) consecutive++;
    for (const m of meals) if (!RECIPE_LIBRARY.find((r) => r.id === m.recipeId)) problems.push(`${label}: receta inexistente en el menú`);
  }
  console.log(`\nSimulación «${label}» (${weeks} semanas, ${total} platos): repetidos en la semana ${inWeek}, repetidos de las 4 semanas anteriores ${in4}, principal igual en comidas principales consecutivas ${consecutive}/${mains}`);
  console.log('  Recetas compatibles por franja:', pools);
  console.log('  Proteínas en comida y cena:', kinds);
  if (inWeek > 0 && Object.values(pools).every((n) => n >= 7)) problems.push(`${label}: hay recetas repetidas dentro de una semana`);
  if (in4 > 0 && enough) problems.push(`${label}: la rotación de 4 semanas no se respeta (${in4})`);
  return data;
}

const sim = simulate('omnívoro', {});
simulate('vegetariano sin gluten', { dietType: 'vegetariana', allergies: ['gluten'] });
simulate('sin pescado ni lactosa, 30 min', { allergies: ['pescado', 'marisco', 'lactosa'], cookingTime: 30 });

// Sustituciones: aceptar la semana, cambiar un día y regenerar no tocan lo aceptado ni otros días
{
  const monday = Object.keys(sim.plan).sort().pop()!;
  const before = JSON.stringify(sim.plan[monday].filter((m) => m.date !== monday));
  regenerateDay(sim, monday, 'x1');
  const after = JSON.stringify(sim.plan[monday].filter((m) => m.date !== monday));
  if (before !== after) problems.push('Cambiar un día modifica otros días');
  acceptWeek(sim, monday);
  const snap = JSON.stringify(sim.plan[monday].map((m) => m.recipeId));
  const changed = regenerateWeek(sim, monday, monday, 'x2');
  if (changed !== 0 || snap !== JSON.stringify(sim.plan[monday].map((m) => m.recipeId))) problems.push('Regenerar cambia platos aceptados');
  sim.plan[monday].forEach((m) => (m.accepted = false));
  const changed2 = regenerateWeek(sim, monday, monday, 'x3');
  if (changed2 === 0) problems.push('Regenerar no propone nada nuevo');
  // lista de la compra: agrupa sin duplicados y conserva lo manual
  sim.shopping[monday] = { checked: {}, qty: {}, removed: {}, manual: [{ id: 'man1', name: 'Papel de cocina', qty: '1', category: 'otros', checked: false }] };
  const list = buildShoppingList(sim, monday);
  const keys = list.groups.flatMap((g) => g.items.map((i) => i.key));
  if (keys.length !== new Set(keys).size) problems.push('Lista de la compra con duplicados');
  if (!keys.includes('man1')) problems.push('La lista de la compra pierde productos manuales');
  regenerateDay(sim, addDays(monday, 2), 'x4');
  if (!buildShoppingList(sim, monday).groups.some((g) => g.items.some((i) => i.key === 'man1'))) problems.push('Al cambiar un día se pierde un producto manual');
  // Comida libre: no suma, no entra en la compra y se respeta al regenerar
  {
    const fm = sim.plan[monday].find((m) => m.slot === 'comida' && m.status === 'pendiente')!;
    const freeRecipe = fm.recipeId;
    const shopBefore = buildShoppingList(sim, monday).total;
    fm.free = true;
    const n = plannedMealNutrition(sim, fm).macros;
    const shopAfter = buildShoppingList(sim, monday);
    regenerateWeek(sim, monday, monday, 'free1');
    regenerateDay(sim, fm.date, 'free2');
    const still = sim.plan[monday].find((m) => m.id === fm.id);
    if (n !== null) problems.push('La comida libre suma calorías previstas');
    if (!still?.free || still.recipeId !== freeRecipe) problems.push('Regenerar cambia o quita una comida libre');
    const usedIn = shopAfter.groups.flatMap((g) => g.items).some((i) => i.usedIn.length && i.usedIn.every((u) => u === recipeTitleOf(freeRecipe)));
    console.log(`\nComida libre: sin calorías previstas ${n === null ? 'sí' : 'NO'}; se conserva al regenerar ${still?.free ? 'sí' : 'NO'}; lista de la compra ${shopBefore} → ${shopAfter.total} productos`);
    if (usedIn) problems.push('La comida libre sigue en la lista de la compra');
  }
  console.log(`\nSustituciones: regenerar tras aceptar cambió ${changed} platos; sin aceptar, ${changed2}. Lista de la compra: ${keys.length} productos sin duplicados.`);
}

// ---------------------------------------------------------------------------
// Postres en el plan y alimentos añadidos a una comida
{
  const months: [string, string][] = [['2026-11-09', 'noviembre'], ['2026-07-06', 'julio']];
  for (const [monday, label] of months) {
    const d = createUserData(baseProfile({ name: 'Postres' }));
    d.profile.targets = { ...d.profile.targets, kcal: 2000 };
    d.plan = {};
    const week = generateWeek(d, monday, { seed: 'postres' });
    const mains = week.filter((m) => m.slot === 'comida' || m.slot === 'cena');
    const withDessert = mains.filter((m) => m.extras?.some((e) => e.kind === 'postre'));
    const fruits = withDessert.flatMap((m) => m.extras!.map((e) => e.foodId));
    const offSeason = label === 'noviembre' ? fruits.filter((f) => ['sandia', 'melon', 'cerezas', 'melocoton', 'albaricoque'].includes(f)) : fruits.filter((f) => ['mandarina', 'caqui', 'naranja'].includes(f));
    const target = d.profile.targets.kcal;
    const dayDiff = [...new Set(week.map((m) => m.date))].map((date) => { d.plan[monday] = week; return Math.abs(dayTotals(d, date).planned.kcal - target) / target; });
    console.log(`\nPostres (${label}): ${withDessert.length} de ${mains.length} comidas y cenas · ${[...new Set(fruits)].join(', ')} · desviación media del objetivo diario ${(dayDiff.reduce((a, b) => a + b, 0) / dayDiff.length * 100).toFixed(1)} %`);
    if (withDessert.length < mains.length * 0.25 || withDessert.length > mains.length * 0.75) problems.push(`Postres: proporción fuera de rango en ${label} (${withDessert.length}/${mains.length})`);
    if (offSeason.length) problems.push(`Postres fuera de temporada en ${label}: ${offSeason.join(', ')}`);
    if (new Set(fruits).size < 4) problems.push(`Postres poco variados en ${label}`);
    if (dayDiff.some((x) => x > 0.35)) problems.push(`Con postres, algún día se aleja más de un 35 % del objetivo (${label})`);
  }
  // alergia a la lactosa: nunca yogur de postre
  const lac = createUserData(baseProfile({ name: 'Sin lactosa', allergies: ['lactosa'] } as Partial<UserProfile>));
  const lacWeek = generateWeek(lac, '2026-11-09', { seed: 'lac' });
  if (lacWeek.some((m) => m.extras?.some((e) => e.foodId.startsWith('yogur')))) problems.push('Postre con lactosa para un perfil con alergia');

  // alimento añadido: suma a la comida y al día, entra en la compra, no escala con la ración, receta intacta
  const d = createUserData(baseProfile({ name: 'Extras' }));
  const monday = '2026-11-09';
  d.plan = { [monday]: generateWeek(d, monday, { seed: 'extras' }) };
  const meal = d.plan[monday].find((m) => m.slot === 'comida' && !m.extras)!;
  const recipe = RECIPE_LIBRARY.find((r) => r.id === meal.recipeId)!;
  const recipeJson = JSON.stringify(recipe);
  const before = plannedMealNutrition(d, meal).macros!.kcal;
  const pan = foods.get('pan')!;
  meal.extras = [{ id: 'e1', foodId: 'pan', amount: 40, kind: 'extra' }];
  const after = plannedMealNutrition(d, meal).macros!.kcal;
  const expected = foodMacros(pan, 40).kcal;
  meal.portion = 1.5;
  const extraRow = mealIngredients(d, meal).find((i) => i.extra === 'e1')!;
  const shop = buildShoppingList(d, monday).groups.flatMap((g) => g.items).find((i) => i.key === 'pan');
  console.log(`Alimento añadido: ${recipeTitleOf(recipe.id)} ${before.toFixed(0)} → ${after.toFixed(0)} kcal (+${expected.toFixed(0)} de 40 g de pan); con ración ×1,5 el pan sigue siendo ${(extraRow.amount * meal.portion).toFixed(0)} g; en la compra: ${shop?.qty}`);
  if (Math.abs(after - before - expected) > 0.01) problems.push('El alimento añadido no suma bien a la comida');
  if (Math.abs(extraRow.amount * meal.portion - 40) > 0.01) problems.push('El alimento añadido cambia al ajustar la ración');
  if (!shop) problems.push('El alimento añadido no entra en la lista de la compra');
  if (JSON.stringify(RECIPE_LIBRARY.find((r) => r.id === recipe.id)) !== recipeJson) problems.push('Añadir un alimento modifica la receta original');
  // regenerar la semana no quita lo añadido a una comida aceptada
  meal.accepted = true;
  regenerateWeek(d, monday, monday, 'extras2');
  if (!d.plan[monday].find((m) => m.id === meal.id)?.extras?.length) problems.push('Regenerar quita los alimentos añadidos de una comida aceptada');
}

// ---------------------------------------------------------------------------
// Hamburguesas: alimentos y recetas
{
  const burgerFoods = [...foods.values()].filter((f) => /^hamburguesa_/.test(f.id));
  const kinds = ['ternera', 'pollo', 'pavo', 'cerdo', 'cordero', 'wagyu', 'vegetal', 'mixta', 'venado', 'bisonte'];
  const missing = kinds.filter((k) => !burgerFoods.some((f) => f.id.includes(k)));
  const burgerRecipes = RECIPE_LIBRARY.filter((r) => /burger|hamburguesa/i.test(r.id));
  const idx = new FoodIndex();
  idx.add([...foods.values()], 6);
  idx.add(OFFICIAL_FOODS, 4);
  const found = idx.search('burger wagyu', { limit: 5 }).map((f) => f.name);
  console.log(`\nHamburguesas: ${burgerFoods.length} alimentos (${burgerFoods.map((f) => `${f.name.replace('Hamburguesa ', '').replace(' (hecha)', '')} ${Math.round(f.per100.kcal)}`).join(', ')} kcal/100 g) · ${burgerRecipes.length} recetas · «burger wagyu» → ${found[0]}`);
  if (missing.length) problems.push(`Faltan hamburguesas de: ${missing.join(', ')}`);
  if (burgerRecipes.length < 20) problems.push(`Pocas recetas de hamburguesa (${burgerRecipes.length})`);
  if (!burgerFoods.every((f) => f.source === 'usda' || (f.source === 'estimacion' && !!f.ref))) problems.push('Hamburguesa sin fuente o sin explicar la estimación');
  if (!/wagyu/i.test(found[0] ?? '')) problems.push('Buscar «burger wagyu» no encuentra la hamburguesa de wagyu');
  const vegan = createUserData(baseProfile({ name: 'Vegana', dietType: 'vegana' } as Partial<UserProfile>));
  if (!candidatesFor(vegan, 'comida').some((r) => /burger/.test(r.id))) problems.push('No hay hamburguesas para perfiles veganos');
  if (candidatesFor(vegan, 'comida').some((r) => r.ingredients.some((i) => i.foodId === 'hamburguesa_vegetal'))) problems.push('Se propone la hamburguesa vegetal (puede llevar huevo) a un perfil vegano');
}

if (RECIPE_LIBRARY.length < 500) problems.push(`Solo hay ${RECIPE_LIBRARY.length} recetas (mínimo 500)`);
if (problems.length) {
  console.error(`\nErrores (${problems.length}):\n- ` + problems.join('\n- '));
  process.exit(1);
}
console.log('\nBiblioteca correcta.');
