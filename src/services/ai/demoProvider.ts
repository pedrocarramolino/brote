import type { AppData, Food } from '../../types';
import { addDays, startOfWeek, todayISO, weekDates } from '../../lib/dates';
import { n0, normalize } from '../../lib/format';
import { allFoods, allRecipes, getRecipe, SLOT_META } from '../catalog';
import { plannedMealNutrition, plannedMealsFor, recipeFit, recipeNutrition } from '../nutrition';
import { buildShoppingList } from '../shopping';
import { dayHabits, trackingStart } from '../habits';
import { findAlternatives } from '../substitutions';
import type { AIProvider } from './types';

/**
 * MODO DEMOSTRACIÓN: respuestas predefinidas por reglas, calculadas en el propio
 * dispositivo con los datos guardados. No hay ningún modelo de lenguaje detrás
 * y la interfaz lo indica en cada respuesta.
 */

const MEDICAL = /(diabet|insulin|medicac|medicament|pastilla|farmac|enfermedad|diagnost|embaraz|lactancia|colesterol|tension|hipertens|tiroid|renal|rinon|higado|cancer|trastorno|anorexia|bulimia|atracon|celiac|crohn|colon irritable|sintoma|dolor)/;

function mentionedFoods(text: string, data: AppData): Food[] {
  const t = normalize(text);
  return allFoods(data).filter((f) => {
    const name = normalize(f.name).split(/[ (]/)[0];
    return name.length > 3 && t.includes(name.slice(0, Math.max(4, name.length - 1)));
  });
}

function answer(text: string, data: AppData): string {
  const t = normalize(text);
  const today = todayISO();
  const p = data.profile;

  if (MEDICAL.test(t)) {
    return [
      'Esa consulta tiene que ver con tu salud y no puedo valorarla: no diagnostico, no interpreto síntomas ni recomiendo cambios de medicación.',
      '',
      'Lo adecuado es comentarlo con tu médico o con un dietista-nutricionista colegiado, que pueden tener en cuenta tu historia clínica. Si notas algo urgente, contacta con tu centro de salud o llama al 112.',
      '',
      'Sí puedo ayudarte a organizar el menú, la compra o a encontrar alternativas a un plato.',
    ].join('\n');
  }

  // 1. ¿Qué puedo cenar con lo que tengo?
  if (/(cenar|cena).*(tengo|nevera|casa)|con lo que tengo|ingredientes que tengo/.test(t)) {
    const monday = startOfWeek(today);
    const shop = buildShoppingList(data, monday);
    const pantry = new Set<string>(shop.groups.flatMap((g) => g.items.filter((i) => i.checked && !i.manual).map((i) => i.key)));
    const said = mentionedFoods(text, data);
    said.forEach((f) => pantry.add(f.id));
    const ranked = allRecipes(data)
      .filter((r) => !r.custom && r.slots.includes('cena') && recipeFit(data, r, p).ok)
      .map((r) => ({ r, have: r.ingredients.filter((i) => pantry.has(i.foodId)).length }))
      .sort((a, b) => b.have / b.r.ingredients.length - a.have / a.r.ingredients.length)
      .slice(0, 3);
    const basis = said.length
      ? `los ingredientes que mencionas (${said.map((f) => f.name.toLowerCase()).join(', ')})`
      : pantry.size
        ? 'los productos que has marcado como comprados en tu lista de esta semana'
        : 'tu catálogo de recetas compatibles (no has marcado productos comprados ni has nombrado ingredientes)';
    return [
      `Según ${basis}, estas cenas encajan con tus preferencias:`,
      ...ranked.map(({ r, have }) => `- **${r.name}** · ${n0(recipeNutrition(data, r).macros.kcal)} kcal · ${r.minutes} min · tienes ${have} de ${r.ingredients.length} ingredientes`),
      '',
      'Puedes cambiar la cena de hoy desde Hoy › Cena › Cambiar plato.',
    ].join('\n');
  }

  // 2. ¿Por qué / cómo sustituir una receta?
  if (/(sustitu|cambiar|alternativa|reemplaz)/.test(t)) {
    const next = plannedMealsFor(data, today).find((m) => m.status === 'pendiente' && p.mealSlots.includes(m.slot));
    const lines = [
      'Al pulsar «Cambiar plato», Brote propone alternativas siguiendo este orden:',
      '- Descarta las recetas con tus alérgenos, las que no encajan con tu tipo de alimentación y las que llevan alimentos que no te gustan.',
      '- Mantiene el mismo tipo de comida (desayuno, comida, cena…).',
      '- Prioriza las que caben en tu tiempo de cocina y se parecen en calorías y proteína al plato original.',
      '- Da un pequeño extra a las que usan ingredientes que ya tienes en el menú de la semana y a tus favoritas.',
    ];
    if (next) {
      const alt = findAlternatives(data, next, 1).alternatives[0];
      const cur = getRecipe(data, next.recipeId);
      if (alt && cur) lines.push('', `Por ejemplo, para tu ${SLOT_META[next.slot].label.toLowerCase()} de hoy (${cur.name}), la primera alternativa sería **${alt.recipe.name}** (${n0(alt.macros.kcal)} kcal${alt.reasons.length ? `; ${alt.reasons.join(', ').toLowerCase()}` : ''}).`);
    }
    lines.push('', 'Nada se cambia hasta que confirmas.');
    return lines.join('\n');
  }

  // 3. Organízame las comidas de mañana
  if (/(organiza|planifica|prepara).*(manana|mañana)|comidas de manana|menu de manana/.test(t)) {
    const tomorrow = addDays(today, 1);
    const meals = plannedMealsFor(data, tomorrow).filter((m) => p.mealSlots.includes(m.slot));
    if (!meals.length) return 'Aún no hay menú generado para mañana. Abre la pestaña Plan y avanza al día de mañana: el menú se creará automáticamente según tus preferencias.';
    let total = 0;
    const lines = meals.map((m) => {
      const r = getRecipe(data, m.recipeId);
      const n = plannedMealNutrition(data, m).macros;
      if (n) total += n.kcal;
      const time = p.schedule[m.slot] ?? SLOT_META[m.slot].time;
      return `- **${time} · ${SLOT_META[m.slot].label}:** ${r?.name ?? m.customName}${n ? ` (${n0(n.kcal)} kcal)` : ' (sin datos)'}`;
    });
    const batch = meals.map((m) => getRecipe(data, m.recipeId)).filter((r) => r?.tags.includes('batch'));
    return [
      'Este es tu menú de mañana según el plan guardado:',
      ...lines,
      '',
      `Total previsto: unas ${n0(total)} kcal.`,
      batch.length ? `Consejo: ${batch.map((r) => r!.name).join(' y ')} se puede dejar preparado esta noche.` : 'Si mañana vas con prisa, puedes cambiar cualquier plato por uno rápido desde Plan.',
    ].join('\n');
  }

  // 4. ¿Qué ingredientes me faltan?
  if (/(falta|faltan|comprar|lista de la compra|compra)/.test(t)) {
    const shop = buildShoppingList(data, startOfWeek(today));
    const pending = shop.groups.flatMap((g) => g.items.filter((i) => !i.checked));
    if (!pending.length) return 'Tu lista de esta semana está completa: no queda nada pendiente de comprar.';
    return [
      `Te quedan **${pending.length}** productos por comprar para completar el menú de esta semana:`,
      ...pending.slice(0, 12).map((i) => `- ${i.name} · ${i.qty}`),
      pending.length > 12 ? `- …y ${pending.length - 12} más en la pestaña Compra.` : '',
    ].filter(Boolean).join('\n');
  }

  // 5. Resumen de la semana
  if (/(resum|cumpl|semana|como voy|progreso)/.test(t)) {
    const monday = startOfWeek(today);
    const start = trackingStart(data);
    const days = weekDates(monday).filter((d) => d <= today && d >= start);
    let done = 0;
    let planned = 0;
    let skipped = 0;
    let habits = 0;
    for (const d of days) {
      const meals = plannedMealsFor(data, d).filter((m) => p.mealSlots.includes(m.slot));
      planned += meals.length;
      done += meals.filter((m) => m.status === 'hecha').length;
      skipped += meals.filter((m) => m.status === 'omitida').length;
      habits += dayHabits(data, d).pct;
    }
    const sessions = data.sessions.filter((s) => s.date >= monday && s.date <= today);
    const steps = data.steps.filter((s) => s.date >= monday && s.date <= today);
    const avgSteps = steps.length ? steps.reduce((a, b) => a + b.steps, 0) / steps.length : 0;
    return [
      `Resumen de esta semana (${days.length} día${days.length === 1 ? '' : 's'}):`,
      `- Comidas del plan completadas: **${done} de ${planned}**${planned ? ` (${Math.round((done / planned) * 100)} %)` : ''}${skipped ? `; ${skipped} omitidas` : ''}.`,
      `- Hábitos cumplidos: **${days.length ? Math.round(habits / days.length) : 0} %** de media.`,
      `- Actividad: **${sessions.length}** sesión(es), ${n0(sessions.reduce((a, s) => a + s.minutes, 0))} min en total.`,
      avgSteps ? `- Pasos: **${n0(avgSteps)}** de media al día (objetivo ${n0(p.stepsTarget)}).` : '- Pasos: sin registros esta semana.',
      '',
      'Son datos de seguimiento, no una valoración de tu salud. Si quieres ajustar objetivos, hazlo con criterio profesional.',
    ].join('\n');
  }

  // 6. Poco tiempo para cocinar
  if (/(poco tiempo|rapid|prisa|sin tiempo|organizar mejor)/.test(t)) {
    const quick = allRecipes(data)
      .filter((r) => !r.custom && r.minutes <= 15 && recipeFit(data, r, p).ok && (r.slots.includes('comida') || r.slots.includes('cena')))
      .slice(0, 4);
    const batch = allRecipes(data).filter((r) => r.tags.includes('batch') && recipeFit(data, r, p).ok).slice(0, 3);
    return [
      'Algunas ideas para organizarte con poco tiempo:',
      '- **Cocina por tandas:** dedica 1 hora el domingo a preparar bases (legumbre, cereal, verdura asada) y combínalas entre semana.',
      batch.length ? `- Recetas que aguantan bien: ${batch.map((r) => r.name).join(', ')}.` : '',
      quick.length ? `- Comidas o cenas en 15 minutos o menos: ${quick.map((r) => r.name).join(', ')}.` : '',
      '- Ajusta en Perfil el tiempo máximo de cocina: el plan y las sustituciones lo tendrán en cuenta.',
      '- Usa la lista de la compra en modo tienda para hacer una sola compra semanal.',
    ].filter(Boolean).join('\n');
  }

  return [
    'Estoy en **modo demostración**: respondo con reglas predefinidas a partir de los datos guardados en este dispositivo, sin un modelo de IA.',
    '',
    'Puedo ayudarte con preguntas como:',
    '- ¿Qué puedo cenar hoy con los ingredientes que tengo?',
    '- ¿Por qué puedo sustituir esta receta?',
    '- Organízame las comidas de mañana',
    '- ¿Qué ingredientes me faltan para completar el menú?',
    '- Resume cómo he cumplido el plan esta semana',
    '- ¿Cómo organizo mejor las comidas si tengo poco tiempo?',
  ].join('\n');
}

export const demoProvider: AIProvider = {
  mode: 'demo',
  async chat({ messages, data }) {
    const last = [...messages].reverse().find((m) => m.role === 'user');
    await new Promise((r) => setTimeout(r, 300));
    return answer(last?.content ?? '', data);
  },
};
