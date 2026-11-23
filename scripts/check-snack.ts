/**
 * Comprobación del picoteo (registros fuera de las comidas).
 * Uso: npm run check:snack
 */
import { baseProfile, createUserData } from '../src/data/demo';
import { dayTotals, logEntryMacros } from '../src/services/nutrition';
import { getFood } from '../src/services/catalog';
import type { AppData, FoodLogEntry } from '../src/types';

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

function n(x: number) { return Math.round(x); }
if (problems.length) {
  console.error(`\n${problems.length} problema(s):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('\nPicoteo correcto.');
