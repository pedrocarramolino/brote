/**
 * Comprobación de la biblioteca de recetas y del planificador.
 * Uso: npm run check:library
 */
import { RECIPE_LIBRARY } from '../src/data/recipeLibrary';
import { BASE_FOODS } from '../src/data/foods';
import { baseProfile, createUserData } from '../src/data/demo';
import { acceptWeek, candidatesFor, generateWeek, regenerateDay, regenerateWeek } from '../src/services/planner';
import { buildShoppingList } from '../src/services/shopping';
import { addDays, startOfWeek } from '../src/lib/dates';
import type { AppData, UserProfile } from '../src/types';

const foods = new Map(BASE_FOODS.map((f) => [f.id, f]));
const problems: string[] = [];
const warn: string[] = [];

const RANGE: Record<string, [number, number]> = {
  desayuno: [180, 700], mediamanana: [80, 380], comida: [330, 950], cena: [220, 800], merienda: [100, 480], snack: [40, 330], postre: [80, 420],
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
    if (f.fiber === undefined) warn.push(`${r.id}: ${i.foodId} sin dato de fibra`);
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
  const enough = Object.values(pools).every((n) => n >= 35);
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
  console.log(`\nSustituciones: regenerar tras aceptar cambió ${changed} platos; sin aceptar, ${changed2}. Lista de la compra: ${keys.length} productos sin duplicados.`);
}

if (RECIPE_LIBRARY.length < 500) problems.push(`Solo hay ${RECIPE_LIBRARY.length} recetas (mínimo 500)`);
if (problems.length) {
  console.error(`\nErrores (${problems.length}):\n- ` + problems.join('\n- '));
  process.exit(1);
}
console.log('\nBiblioteca correcta.');
