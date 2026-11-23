/**
 * Comprobación del picoteo (registros fuera de las comidas).
 * Uso: npm run check:snack
 */
import { baseProfile, createUserData } from '../src/data/demo';
import { dayTotals, logEntryMacros } from '../src/services/nutrition';
import { getFood } from '../src/services/catalog';
import type { AppData, FoodLogEntry } from '../src/types';
import { BASE_FOODS, OFFICIAL_FOODS } from '../src/data/foods';
import { buildIndex, parseMealText } from '../src/services/mealText';
import { foodMacros } from '../src/services/nutrition';

const problems: string[] = [];
const ok = (cond: boolean, msg: string, detail = '') => {
  console.log(`${cond ? '✓' : '✗'} ${msg}${detail ? ` — ${detail}` : ''}`);
  if (!cond) problems.push(msg);
};

const d: AppData = createUserData(baseProfile({ name: 'Picoteo' }));
d.plan = {};
const date = '2026-11-23';
const almendras = getFood(d, 'almendras')!;
const base = dayTotals(d, date).consumed.kcal;
const snackFood: FoodLogEntry = { id: 's1', date, slot: 'merienda', foodId: 'almendras', amount: 30, method: 'manual', createdAt: '1', snack: true, per100: { ...almendras.per100 } };
const quick: FoodLogEntry = { id: 's2', date, slot: 'cena', foodId: '', amount: 1, method: 'manual', createdAt: '2', snack: true, quick: true, snapshot: { name: 'Patatas fritas del bar', perServing: { kcal: 250, protein: 3, carbs: 25, fat: 15 }, complete: true, at: '' } };
d.log.push(snackFood, quick);
const t = dayTotals(d, date);
const almK = (almendras.per100.kcal * 30) / 100;
ok(Math.abs(t.consumed.kcal - base - almK - 250) < 0.01, 'El picoteo suma al total del día', `${n(almK)} (30 g de almendras) + 250 (a mano) = ${n(t.consumed.kcal - base)} kcal`);
ok(Math.abs(t.consumed.fat - (almendras.per100.fat * 30) / 100 - 15) < 0.01, 'También suma sus macronutrientes');
ok(logEntryMacros(d, quick)!.kcal === 250, 'Calorías a mano: se cuentan tal cual se introducen');
ok(d.log.filter((l) => l.date === date && l.slot === 'merienda' && !l.snack).length === 0, 'No se mezcla con los registros de la merienda');
const other = dayTotals(d, '2026-11-24').consumed.kcal;
ok(other === dayTotals(createUserData(baseProfile({ name: 'x' })), '2026-11-24').consumed.kcal, 'Solo cuenta en su día');
const back = JSON.parse(JSON.stringify(d)) as AppData;
ok(back.log.filter((l) => l.snack).length === 2 && back.log.find((l) => l.quick)?.snapshot?.name === 'Patatas fritas del bar', 'Se guarda y se recupera (JSON)');
// pasar un picoteo a una comida (y al revés) sin perder sus valores
const before = dayTotals(d, date).consumed.kcal;
delete d.log.find((l) => l.id === 's1')!.snack;
ok(dayTotals(d, date).consumed.kcal === before, 'Moverlo a una comida no cambia el total del día');

// ---------------------------------------------------------------------------
// Escribir lo que se ha comido: la app reconoce alimento y cantidad y calcula los valores
{
  const idx = buildIndex({ base: BASE_FOODS, official: OFFICIAL_FOODS, custom: [] });
  const cases: [string, [RegExp, number | null][]][] = [
    ['un puñado de almendras y una cerveza', [[/^Almendras$/, 20], [/^Cerveza con alcohol$/, 330]]],
    ['2 galletas maría', [[/Galletas tipo maria/, 14]]],
    ['una bolsa de patatas fritas', [[/chips/, 40]]],
    ['dos cañas y unas aceitunas', [[/Cerveza/, 400], [/^Aceitunas$/, 30]]],
    ['una copa de vino tinto', [[/Vino tinto/, 150]]],
    ['200 ml de zumo de naranja', [[/Zumo de naranja/, 200]]],
    ['una coca cola', [[/Refresco, sabor cola/, 330]]],
    ['un yogur y un plátano', [[/^Yogur natural$/, 125], [/^Plátano$/, 120]]],
    ['3 onzas de chocolate negro', [[/Chocolate negro/, 30]]],
    ['un café con leche y 2 magdalenas', [[/Café, con leche/, 200], [/Magdalena/, 60]]],
  ];
  let good = 0;
  const fails: string[] = [];
  for (const [text, expect] of cases) {
    const items = parseMealText({ customFoods: [], customRecipes: [] }, text, idx);
    const okCase = items.length === expect.length && expect.every(([re, g], i) => items[i]?.food && re.test(items[i].food!.name) && (g === null || Math.abs(items[i].amount - g) < 0.5));
    if (okCase) good++; else fails.push(`${text} → ${items.map((i) => `${i.food?.name ?? '?'} ${i.amount}`).join(', ')}`);
  }
  ok(good === cases.length, 'Reconoce alimentos y cantidades caseras en lo escrito', `${good}/${cases.length}${fails.length ? ' · ' + fails.join(' | ') : ''}`);
  const [alm, cer] = parseMealText({ customFoods: [], customRecipes: [] }, 'un puñado de almendras y una cerveza', idx);
  const kcal = foodMacros(alm.food!, alm.amount).kcal + foodMacros(cer.food!, cer.amount).kcal;
  ok(Math.abs(kcal - ((alm.food!.per100.kcal * alm.amount) / 100 + (cer.food!.per100.kcal * cer.amount) / 100)) < 1e-9 && alm.food!.source !== 'estimacion', 'Las calorías salen de la base (valores por 100 g × cantidad)', `${n(kcal)} kcal`);
  const tort = parseMealText({ customFoods: [], customRecipes: [] }, 'tortilla de patata', idx)[0];
  const boc = parseMealText({ customFoods: [], customRecipes: [] }, 'medio bocadillo de jamón', idx)[0];
  ok(!!tort?.recipe && !!boc?.recipe && boc.amount === 0.5, 'Si es un plato (tortilla de patata, bocadillo de jamón) usa la receta', `${tort?.recipe?.title} · ${boc?.recipe?.title} × ${boc?.amount}`);
  const none = parseMealText({ customFoods: [], customRecipes: [] }, 'xyzzy qwerty', idx);
  ok(none.every((i) => !i.food && !i.recipe), 'Lo que no reconoce no se inventa');
}

function n(x: number) { return Math.round(x); }
if (problems.length) {
  console.error(`\n${problems.length} problema(s):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('\nPicoteo correcto.');
