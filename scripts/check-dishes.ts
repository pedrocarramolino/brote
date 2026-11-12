/**
 * Pruebas de «Mis platos» sobre la lógica real de la app (cálculo, guardado, plan,
 * registro diario, lista de la compra e historial).
 * Uso: npm run check:dishes
 */
import { baseProfile, createUserData } from '../src/data/demo';
import { getFood } from '../src/services/catalog';
import {
  deleteDish, dishLogEntry, dishNutrition, duplicateDish, emptyDraft, saveDish, toBaseAmount, userDishes, type DishDraft,
} from '../src/services/dishes';
import { dayTotals, plannedMealNutrition } from '../src/services/nutrition';
import { buildShoppingList } from '../src/services/shopping';
import { startOfWeek } from '../src/lib/dates';
import type { AppData, FoodLogEntry } from '../src/types';

let failed = 0;
let n = 0;
const near = (a: number, b: number, eps = 0.01) => Math.abs(a - b) <= eps;
function check(name: string, ok: boolean, detail = '') {
  n++;
  if (ok) console.log(`✓ ${n}. ${name}${detail ? ` — ${detail}` : ''}`);
  else {
    failed++;
    console.error(`✗ ${n}. ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

const TODAY = '2026-11-12';
const data: AppData = createUserData(baseProfile({ name: 'Prueba' }));
data.plan = {};
const kcalOf = (id: string) => getFood(data, id)!.per100.kcal;

// 1. Un solo ingrediente
let d: DishDraft = { ...emptyDraft(), name: 'Arroz solo', items: [{ foodId: 'arroz', quantity: 100, unit: 'g' }] };
let r = dishNutrition(data, d.items, 1);
check('Plato con un solo ingrediente', near(r.total.kcal, kcalOf('arroz')), `100 g de arroz = ${r.total.kcal} kcal (base: ${kcalOf('arroz')} kcal/100 g)`);

// 2. Cinco ingredientes
d = {
  ...emptyDraft(),
  name: 'Mi arroz especial',
  items: [
    { foodId: 'arroz', quantity: 100, unit: 'g' },
    { foodId: 'pollo', quantity: 150, unit: 'g' },
    { foodId: 'aceite', quantity: 10, unit: 'g' },
    { foodId: 'tomate', quantity: 80, unit: 'g' },
    { foodId: 'cebolla', quantity: 40, unit: 'g' },
  ],
};
const expected5 = d.items.reduce((a, i) => a + (kcalOf(i.foodId) * i.quantity) / 100, 0);
r = dishNutrition(data, d.items, 1);
check('Plato con cinco ingredientes', near(r.total.kcal, expected5) && r.missing.length === 0, `${r.total.kcal.toFixed(1)} kcal = suma manual ${expected5.toFixed(1)}`);

// 3. Cambiar una cantidad
d.items[1] = { ...d.items[1], quantity: 200 };
const r3 = dishNutrition(data, d.items, 1);
check('Cambiar la cantidad recalcula', near(r3.total.kcal - r.total.kcal, (kcalOf('pollo') * 50) / 100), `+50 g de pollo = +${(r3.total.kcal - r.total.kcal).toFixed(1)} kcal`);

// 4. Eliminar un ingrediente
const without = d.items.filter((i) => i.foodId !== 'aceite');
const r4 = dishNutrition(data, without, 1);
check('Eliminar un ingrediente', near(r3.total.kcal - r4.total.kcal, (kcalOf('aceite') * 10) / 100), `sin aceite: −${(r3.total.kcal - r4.total.kcal).toFixed(1)} kcal`);

// 5. Cambiar raciones: el total no cambia, la ración sí
const r5 = dishNutrition(data, d.items, 2);
check('Cambiar raciones', near(r5.total.kcal, r3.total.kcal) && near(r5.perServing.kcal, r3.total.kcal / 2), `total ${r5.total.kcal.toFixed(0)} · ración ${r5.perServing.kcal.toFixed(0)}`);

// Unidades: sin conversiones sin densidad
const leche = getFood(data, 'leche')!;
const huevo = getFood(data, 'huevo')!;
const aceite = getFood(data, 'aceite')!;
check(
  'Unidades fiables (ml≠g sin densidad, unidad y cucharada solo si hay dato)',
  toBaseAmount(leche, 100, 'g') === null && toBaseAmount(leche, 1, 'l') === 1000 && toBaseAmount(huevo, 2, 'unidad') === 110 && toBaseAmount(aceite, 1, 'cucharada') === 10 && toBaseAmount(getFood(data, 'pollo')!, 1, 'cucharada') === null,
  'leche en g → no; 1 l = 1000 ml; 2 huevos = 110 g; 1 cda aceite = 10 g; pollo en cucharadas → no',
);

// 6. Guardar
d.servings = 2;
const saved = saveDish(data, { ...d, id: 'dish_test' }, TODAY);
const perServingPollo = saved.ingredients.find((i) => i.foodId === 'pollo')!.amount;
check('Guardar el plato', userDishes(data).length === 1 && saved.custom === true && saved.title === 'Mi arroz especial' && perServingPollo === 100 && saved.servings === 2, `${saved.title}: 2 raciones, 100 g de pollo por ración`);

// 7. Persistencia (los datos se guardan como JSON)
const reloaded = JSON.parse(JSON.stringify(data)) as AppData;
const rr = reloaded.customRecipes.find((x) => x.id === 'dish_test')!;
check('Sigue guardado tras recargar', !!rr && JSON.stringify(dishNutrition(reloaded, rr.dish!.items, rr.servings).total) === JSON.stringify(r5.total), 'ingredientes, cantidades, raciones y valores idénticos');

// 10. Añadir al menú semanal
const monday = startOfWeek(TODAY);
data.plan[monday] = [
  { id: 'pm_past', date: '2026-11-10', slot: 'comida', recipeId: 'dish_test', portion: 1, status: 'hecha' },
  { id: 'pm_future', date: '2026-11-14', slot: 'cena', recipeId: 'dish_test', portion: 1, status: 'pendiente' },
  { id: 'pm_lib', date: '2026-11-13', slot: 'comida', recipeId: 'pollo-boniato', portion: 1, status: 'pendiente' },
];
const planned = plannedMealNutrition(data, data.plan[monday][1]).macros!;
const list = buildShoppingList(data, monday);
const polloItem = list.groups.flatMap((g) => g.items).find((i) => i.key === 'pollo')!;
check(
  'Añadir un plato propio al menú semanal',
  near(planned.kcal, r5.perServing.kcal) && polloItem.amount === 100 * 2 + 150 && polloItem.fromMyDishes,
  `cena: ${planned.kcal.toFixed(0)} kcal; lista: pollo ${polloItem.amount} g sumado con la receta de la biblioteca, marcado «incluye Mis platos»`,
);

// 11–13. Registrar en Hoy una ración y media ración
const log = (servings: number): FoodLogEntry => ({ ...dishLogEntry(data, saved, { date: TODAY, slot: 'cena', servings }), id: `log_${servings}`, createdAt: new Date().toISOString() });
data.log.push(log(1));
const t1 = dayTotals(data, TODAY).consumed.kcal;
check('Registrar una ración en Hoy', near(t1, r5.perServing.kcal), `${t1.toFixed(1)} kcal`);
data.log.push(log(0.5));
const t2 = dayTotals(data, TODAY).consumed.kcal;
check('Registrar media ración', near(t2 - t1, r5.perServing.kcal / 2), `+${(t2 - t1).toFixed(1)} kcal`);
check('Las calorías del día suman bien', near(t2, r5.perServing.kcal * 1.5), `1,5 raciones = ${t2.toFixed(1)} kcal`);

// 14. Eliminar un consumo sin borrar el plato
data.log = data.log.filter((l) => l.id !== 'log_0.5');
check('Eliminar un consumo no borra el plato', userDishes(data).length === 1 && near(dayTotals(data, TODAY).consumed.kcal, t1), `quedan ${data.log.length} registro(s) y el plato sigue en Mis platos`);

// 8. Editar (y 15. el historial no cambia)
const beforeLog = dayTotals(data, TODAY).consumed.kcal;
const beforePast = plannedMealNutrition(data, data.plan[monday][0]).macros!.kcal;
const edited = saveDish(data, { ...d, id: 'dish_test', name: 'Mi arroz especial v2', items: [...d.items, { foodId: 'guisantes', quantity: 100, unit: 'g' }] }, TODAY);
const afterFuture = plannedMealNutrition(data, data.plan[monday][1]).macros!.kcal;
check('Editar un plato', edited.title === 'Mi arroz especial v2' && afterFuture > planned.kcal && userDishes(data).length === 1, `nuevo valor por ración ${afterFuture.toFixed(0)} kcal en los usos futuros`);
check(
  'El historial no cambia al editar',
  near(dayTotals(data, TODAY).consumed.kcal, beforeLog) && near(plannedMealNutrition(data, data.plan[monday][0]).macros!.kcal, beforePast),
  `registro de hoy ${beforeLog.toFixed(0)} kcal y comida del día 10 ${beforePast.toFixed(0)} kcal, sin cambios`,
);

// 9. Duplicar
const copy = duplicateDish(data, 'dish_test')!;
copy.dish!.items[0].quantity = 999;
check('Duplicar crea una copia independiente', userDishes(data).length === 2 && copy.id !== 'dish_test' && data.customRecipes.find((x) => x.id === 'dish_test')!.dish!.items[0].quantity === 100, copy.title ?? '');

// Eliminar el plato conserva lo registrado y planificado
deleteDish(data, 'dish_test', TODAY);
check(
  'Eliminar el plato conserva el historial',
  !data.customRecipes.some((x) => x.id === 'dish_test') && near(dayTotals(data, TODAY).consumed.kcal, beforeLog) && plannedMealNutrition(data, data.plan[monday][1]).macros !== null,
  'registro y menú mantienen sus valores',
);

// Datos incompletos: se avisa y no se presenta como exacto
const inc = dishNutrition(data, [{ foodId: 'leche', quantity: 200, unit: 'g' }, { foodId: 'avena', quantity: 50, unit: 'g' }], 1);
check('Datos incompletos se marcan', inc.missing.length === 1 && inc.quality === 'pendiente', 'leche en gramos no se suma y el resultado se marca incompleto');

console.log(failed ? `\n${failed} prueba(s) fallida(s)` : `\nTodas las pruebas de Mis platos pasan (${n}).`);
if (failed) process.exit(1);
