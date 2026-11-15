/**
 * Comprobación del objetivo y el registro de calorías quemadas.
 * Uso: npm run check:burn
 */
import { baseProfile, createUserData } from '../src/data/demo';
import { burnedOn, burnProgress, burnTarget, latestWeightKg, restingKcal, SEDENTARY_FACTOR } from '../src/services/burn';
import { dayTotals } from '../src/services/nutrition';
import type { AppData } from '../src/types';

const problems: string[] = [];
const ok = (cond: boolean, msg: string, detail = '') => {
  console.log(`${cond ? '✓' : '✗'} ${msg}${detail ? ` — ${detail}` : ''}`);
  if (!cond) problems.push(msg);
};

const d: AppData = createUserData(baseProfile({ name: 'Quemadas' }));
ok(Array.isArray(d.burned) && d.burned.length === 0, 'Los datos nuevos empiezan con el registro vacío');

// 1. objetivo calculado: ingesta + déficit − gasto sin ejercicio
d.profile.targets = { kcal: 1800, origin: 'usuario' };
d.weights = [{ id: 'w1', date: '2026-11-10', kg: 65 }, { id: 'w0', date: '2026-10-01', kg: 67 }];
ok(latestWeightKg(d) === 65, 'Propone el último peso registrado', '65 kg');
d.profile.burnGoal = { mode: 'calculado', deficit: 500, sex: 'mujer', age: 30, heightCm: 165, weightKg: 65, updatedAt: '' };
const resting = 10 * 65 + 6.25 * 165 - 5 * 30 - 161; // Mifflin-St Jeor, mujer
const expected = Math.round((1800 + 500 - resting * SEDENTARY_FACTOR) / 10) * 10;
const t = burnTarget(d);
ok(Math.abs(restingKcal('mujer', 65, 165, 30) - resting) < 1e-9 && t.kcal === expected, 'Objetivo = ingesta + déficit − gasto sin ejercicio', `reposo ${resting.toFixed(0)} × 1,2 = ${(resting * 1.2).toFixed(0)}; 1800 + 500 − ${(resting * 1.2).toFixed(0)} = ${t.kcal} kcal`);
ok(t.kcal! < resting * SEDENTARY_FACTOR, 'El objetivo es actividad, no el gasto total del día', `${t.kcal} kcal frente a ${(resting * 1.2).toFixed(0)} de gasto sin ejercicio`);

// 2. sigue al objetivo de ingesta sin modificarlo
d.profile.targets.kcal = 2000;
ok(burnTarget(d).kcal === expected + 200 && d.profile.targets.kcal === 2000, 'Si sube la ingesta, sube lo que hay que quemar (y la ingesta no se toca)', `${burnTarget(d).kcal} kcal con 2000 de ingesta`);
d.profile.targets.kcal = 1000;
const low = burnTarget(d);
ok(low.kcal === 0, 'Si la ingesta ya consigue el déficit, el objetivo es 0 (no negativo)', `raw ${low.calc?.raw.toFixed(0)}`);
d.profile.targets.kcal = 1800;

// 3. datos que faltan: no se inventan
const miss = burnTarget({ profile: { ...d.profile, targets: {}, burnGoal: { mode: 'calculado', deficit: 500, updatedAt: '' } } });
ok(miss.kcal === null && miss.missing.join(',') === 'objetivo de energía (ingesta),sexo,edad,altura,peso', 'Sin datos suficientes no hay objetivo; dice qué falta', miss.missing.join(', '));
ok(burnTarget({ profile: { ...d.profile, burnGoal: undefined } }).kcal === null, 'Sin configurar no hay objetivo');
ok(burnTarget({ profile: { ...d.profile, burnGoal: { mode: 'manual', kcal: 450, updatedAt: '' } } }).kcal === 450, 'Objetivo fijado a mano');

// 4. registro: varios al día, editar, eliminar, días separados
const before = dayTotals(d, '2026-11-15');
d.burned.push({ id: 'b1', date: '2026-11-15', kcal: 200, note: 'Caminar', createdAt: '1' }, { id: 'b2', date: '2026-11-15', kcal: 150, createdAt: '2' }, { id: 'b0', date: '2026-11-14', kcal: 400, createdAt: '0' });
ok(burnedOn(d, '2026-11-15') === 350 && burnedOn(d, '2026-11-14') === 400 && burnedOn(d, '2026-11-16') === 0, 'Varios registros se acumulan en el día; cada día empieza en 0 y el anterior se conserva');
const p1 = burnProgress(d, '2026-11-15');
ok(p1.target === expected && p1.remaining === Math.max(0, expected - 350) && p1.percent === Math.round((350 / expected) * 100), 'Progreso: objetivo, quemadas, restantes y %', `${p1.burned} de ${p1.target} · faltan ${p1.remaining} · ${p1.percent} %`);
d.burned.find((b) => b.id === 'b2')!.kcal = 300;
const p2 = burnProgress(d, '2026-11-15');
ok(p2.burned === 500 && p2.percent! > p1.percent!, 'Al editar un registro el progreso se actualiza', `${p1.burned} → ${p2.burned} kcal`);
d.burned = d.burned.filter((b) => b.id !== 'b1');
ok(burnedOn(d, '2026-11-15') === 300 && burnedOn(d, '2026-11-14') === 400, 'Al eliminar un registro solo cambia ese día');
const json = JSON.parse(JSON.stringify(d)) as AppData;
ok(burnedOn(json, '2026-11-14') === 400 && json.profile.burnGoal?.deficit === 500, 'Se guarda y se recupera (JSON)');

// 5. independiente de lo que se come y de los pasos
const after = dayTotals(d, '2026-11-15');
ok(JSON.stringify(before) === JSON.stringify(after) && d.profile.targets.kcal === 1800, 'Las calorías quemadas no cambian lo comido ni el objetivo de ingesta', `consumido ${after.consumed.kcal} kcal`);
d.steps.push({ date: '2026-11-15', steps: 9000 });
ok(burnedOn(d, '2026-11-15') === 300 && d.steps.find((s) => s.date === '2026-11-15')?.steps === 9000, 'Pasos y calorías quemadas son registros separados');

if (problems.length) {
  console.error(`\n${problems.length} problema(s):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log('\nCalorías quemadas correctas.');
