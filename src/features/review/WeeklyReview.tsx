import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarCheck, ChevronRight, Plus } from 'lucide-react';
import type { Allergen, Goal, MealSlot, PlannedMeal, UserProfile } from '../../types';
import { Sheet } from '../../components/ui/Sheet';
import { Badge, Button, Card, Chip, Segmented, SelectField, TextField, cx } from '../../components/ui/primitives';
import { TagInput } from '../../components/TagInput';
import { useFeedback } from '../../components/ui/Feedback';
import { useData, useStore } from '../../store/AppStore';
import { formatDate, formatWeekRange, formatWeekdayShort, formatShort, startOfWeek } from '../../lib/dates';
import { n0, n1, parseDecimal, uid } from '../../lib/format';
import { ALL_SLOTS, getRecipe, SLOT_META } from '../../services/catalog';
import { regenerateFrom } from '../../services/planner';
import {
  applyMenuDecisions,
  decisionKey,
  lastWeekRecap,
  proposedAdditions,
  reviewMenu,
  type MenuDecision,
} from '../../services/weeklyReview';
import { ALLERGEN_LABELS } from '../../data/foods';
import { ALLERGENS, COOK_TIMES, DIETS, DISLIKE_SUGGESTIONS, GOALS, LEVELS } from '../../data/options';
import { MEASURES } from '../progress/EntrySheets';

const STEPS = ['Tu semana', 'Preferencias', 'Menú', 'Resumen'] as const;

type PrefDraft = Pick<UserProfile, 'goal' | 'activityLevel' | 'dietType' | 'allergies' | 'dislikes' | 'likes' | 'mealSlots' | 'cookingTime'>;

const pickPrefs = (p: UserProfile): PrefDraft => ({
  goal: p.goal,
  activityLevel: p.activityLevel,
  dietType: p.dietType,
  allergies: [...p.allergies],
  dislikes: [...p.dislikes],
  likes: [...p.likes],
  mealSlots: [...p.mealSlots],
  cookingTime: p.cookingTime,
});

const sameList = (a: string[], b: string[]) => a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

function optionLabel(o: MenuDecision): string {
  switch (o.kind) {
    case 'keep':
      return 'Mantener';
    case 'remove':
      return 'Quitar esta comida';
    case 'ingredients':
      return `Cambiar ingredientes: ${o.label}`;
    case 'recipe':
      return `Cambiar por ${o.label}`;
  }
}

/** Tarjeta en Hoy cuando la revisión de la semana está pendiente. */
export function WeeklyReviewCard({ onStart, onPostpone }: { onStart: () => void; onPostpone: () => void }) {
  return (
    <Card className="mb-5 flex flex-col gap-3 p-4 sm:flex-row sm:items-center" data-weekly-review-card>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accentSoft text-accent-deep">
        <CalendarCheck size={22} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[16px] font-semibold">Nueva semana: revisa tus datos</p>
        <p className="text-[14px] text-ink2">Peso, medidas, preferencias y menú. Nada cambia hasta que lo confirmes.</p>
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={onPostpone}>Más tarde</Button>
        <Button size="sm" onClick={onStart} icon={<ChevronRight size={16} />} className="flex-row-reverse">Revisar</Button>
      </div>
    </Card>
  );
}

export function WeeklyReviewSheet({ open, onClose, today }: { open: boolean; onClose: () => void; today: string }) {
  const data = useData();
  const { mutate } = useStore();
  const { toast } = useFeedback();
  const monday = startOfWeek(today);

  const [step, setStep] = useState(0);
  const [kg, setKg] = useState('');
  const [meas, setMeas] = useState<Record<string, string>>({});
  const [err, setErr] = useState<Record<string, string>>({});
  const [prefs, setPrefs] = useState<PrefDraft>(() => pickPrefs(data.profile));
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [addSel, setAddSel] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setKg('');
    setMeas({});
    setErr({});
    setPrefs(pickPrefs(data.profile));
    setPicks({});
    setAddSel({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const recap = useMemo(() => lastWeekRecap(data, today), [data, today]);
  const draftProfile: UserProfile = useMemo(() => ({ ...data.profile, ...prefs }), [data.profile, prefs]);
  const menu = useMemo(() => (open && step >= 2 ? reviewMenu(data, draftProfile, today) : []), [open, step, data, draftProfile, today]);
  const additions = useMemo(() => (open && step >= 2 ? proposedAdditions(data, draftProfile, today) : []), [open, step, data, draftProfile, today]);
  const newSlots = prefs.mealSlots.filter((s) => !data.profile.mealSlots.includes(s));
  const removedSlots = data.profile.mealSlots.filter((s) => !prefs.mealSlots.includes(s));

  const decisionFor = (id: string): MenuDecision => {
    const item = menu.find((m) => m.meal.id === id)!;
    const k = picks[id];
    return item.options.find((o) => decisionKey(o) === k) ?? (item.conflicts.length ? item.options[0] : { kind: 'keep' });
  };
  const addKey = (m: PlannedMeal) => `${m.date}|${m.slot}`;
  const isAdded = (m: PlannedMeal) => addSel[addKey(m)] ?? newSlots.includes(m.slot);

  const todayWeight = data.weights.find((w) => w.date === today);
  const todayMeas = data.measurements.find((m) => m.date === today);

  /* ----------------------------- validación ----------------------------- */
  const validateStep0 = () => {
    const e: Record<string, string> = {};
    if (kg.trim()) {
      const v = parseDecimal(kg);
      if (!Number.isFinite(v) || v < 25 || v > 350) e.kg = 'Introduce un peso entre 25 y 350 kg.';
    }
    for (const [k, label] of MEASURES) {
      if (!meas[k]?.trim()) continue;
      const v = parseDecimal(meas[k]);
      if (!Number.isFinite(v) || v < 10 || v > 250) e[k] = `${label}: entre 10 y 250 cm.`;
    }
    setErr(e);
    return !Object.keys(e).length;
  };

  /* ------------------------------ resumen ------------------------------ */
  const weightVal = kg.trim() ? Math.round(parseDecimal(kg) * 10) / 10 : null;
  const measVals = Object.fromEntries(MEASURES.filter(([k]) => meas[k]?.trim()).map(([k]) => [k, Math.round(parseDecimal(meas[k]) * 10) / 10]));
  const p0 = data.profile;
  const prefsAffectPlan =
    prefs.dietType !== p0.dietType || !sameList(prefs.allergies, p0.allergies) || !sameList(prefs.dislikes, p0.dislikes) || prefs.cookingTime !== p0.cookingTime || !sameList(prefs.mealSlots, p0.mealSlots);
  const futureWeeks = Object.keys(data.plan).filter((w) => w > monday);

  const summary: string[] = [];
  if (weightVal !== null)
    summary.push(todayWeight ? `Peso de hoy: ${n1(weightVal)} kg (sustituye el registro de hoy, ${n1(todayWeight.kg)} kg)` : `Nuevo registro de peso: ${n1(weightVal)} kg`);
  if (Object.keys(measVals).length)
    summary.push(
      `${todayMeas ? 'Medidas de hoy actualizadas' : 'Nuevas medidas'}: ${MEASURES.filter(([k]) => k in measVals).map(([k, l]) => `${l.toLowerCase()} ${n1(measVals[k])} cm`).join(', ')}`,
    );
  if (prefs.goal !== p0.goal) summary.push(`Objetivo: ${GOALS.find((g) => g.value === prefs.goal)?.label ?? 'sin indicar'}`);
  if (prefs.activityLevel !== p0.activityLevel) summary.push(`Nivel de actividad: ${LEVELS.find((l) => l.value === prefs.activityLevel)?.label ?? 'sin indicar'}`);
  if (prefs.dietType !== p0.dietType) summary.push(`Alimentación: ${DIETS.find((d) => d.value === prefs.dietType)?.label ?? 'sin indicar'}`);
  if (!sameList(prefs.allergies, p0.allergies)) summary.push(`Alergias: ${prefs.allergies.map((a) => ALLERGEN_LABELS[a]).join(', ') || 'ninguna'}`);
  if (!sameList(prefs.dislikes, p0.dislikes)) summary.push(`No te gusta: ${prefs.dislikes.join(', ') || 'nada indicado'}`);
  if (!sameList(prefs.likes, p0.likes)) summary.push(`Te gusta: ${prefs.likes.join(', ') || 'nada indicado'}`);
  if (newSlots.length) summary.push(`Comidas añadidas al día: ${newSlots.map((s) => SLOT_META[s].label.toLowerCase()).join(', ')}`);
  if (removedSlots.length) summary.push(`Comidas quitadas del día: ${removedSlots.map((s) => SLOT_META[s].label.toLowerCase()).join(', ')} (lo ya registrado no se borra)`);
  if (prefs.cookingTime !== p0.cookingTime) summary.push(`Tiempo máximo por receta: ${COOK_TIMES.find((c) => c.value === prefs.cookingTime)?.label}`);
  const menuChanges = menu
    .map((it) => ({ it, dec: decisionFor(it.meal.id) }))
    .filter(({ dec }) => dec.kind !== 'keep');
  for (const { it, dec } of menuChanges) {
    const when = `${formatWeekdayShort(it.meal.date)} · ${SLOT_META[it.meal.slot].label}`;
    const name = getRecipe(data, it.meal.recipeId)?.name ?? it.meal.customName ?? 'Plato';
    summary.push(dec.kind === 'remove' ? `${when}: quitar ${name}` : dec.kind === 'recipe' ? `${when}: ${name} → ${dec.label}` : `${when}: ${name} (${dec.kind === 'ingredients' ? dec.label : ''})`);
  }
  const addList = additions.filter(isAdded);
  for (const a of addList) summary.push(`${formatWeekdayShort(a.date)} · ${SLOT_META[a.slot].label}: añadir ${getRecipe(data, a.recipeId)?.name}`);
  if (prefsAffectPlan && futureWeeks.length) summary.push('Las semanas siguientes ya creadas recalculan sus platos pendientes con tus nuevas preferencias');

  /* ------------------------------ aplicar ------------------------------ */
  const confirm = () => {
    const decisions = Object.fromEntries(menuChanges.map(({ it, dec }) => [it.meal.id, dec]));
    mutate((d) => {
      if (weightVal !== null) {
        const w = d.weights.find((x) => x.date === today);
        if (w) w.kg = weightVal;
        else d.weights.push({ id: uid('w'), date: today, kg: weightVal });
      }
      if (Object.keys(measVals).length) {
        const m = d.measurements.find((x) => x.date === today);
        if (m) Object.assign(m, measVals);
        else d.measurements.push({ id: uid('m'), date: today, ...measVals });
      }
      Object.assign(d.profile, prefs);
      applyMenuDecisions(d, decisions, addList);
      if (prefsAffectPlan) for (const w of futureWeeks) regenerateFrom(d, w);
      d.weeklyReview = { lastCompleted: monday };
    });
    toast(summary.length ? 'Revisión guardada' : 'Revisión completada sin cambios');
    onClose();
  };

  const next = () => {
    if (step === 0 && !validateStep0()) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    document.querySelector('[data-review-body]')?.closest('.overflow-y-auto')?.scrollTo({ top: 0 });
  };

  const setP = <K extends keyof PrefDraft>(k: K, v: PrefDraft[K]) => setPrefs((p) => ({ ...p, [k]: v }));

  const lastWeight = recap.lastWeight;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      size="lg"
      title="Revisión semanal"
      subtitle={`Semana ${formatWeekRange(monday)} · Paso ${step + 1} de ${STEPS.length}: ${STEPS[step]}`}
      footer={
        <div className="flex gap-2">
          {step > 0 && (
            <Button variant="secondary" className="min-w-0 flex-1" onClick={() => setStep((s) => s - 1)}>
              Atrás
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button className="min-w-0 flex-[1.4]" onClick={next}>Siguiente</Button>
          ) : (
            <Button className="min-w-0 flex-[1.4]" onClick={confirm} data-review-confirm>
              {summary.length ? 'Confirmar cambios' : 'Confirmar sin cambios'}
            </Button>
          )}
        </div>
      }
    >
      <div data-review-body data-step={step}>
        <ol className="mb-5 flex gap-1.5" aria-label="Progreso de la revisión">
          {STEPS.map((s, i) => (
            <li key={s} className={cx('h-1 flex-1 rounded-full', i <= step ? 'bg-accent' : 'bg-surface2')} aria-current={i === step ? 'step' : undefined}>
              <span className="sr-only">{s}</span>
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="space-y-5">
            <div className="rounded-[16px] bg-surface2 p-4">
              <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink3">Semana pasada · {formatWeekRange(recap.monday)}</p>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-[15px] xs:grid-cols-2">
                <div className="flex justify-between gap-2"><dt className="text-ink2">Comidas hechas</dt><dd className="tabular font-semibold">{recap.mealsTotal ? `${recap.mealsDone} de ${recap.mealsTotal}` : 'Sin datos'}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-ink2">Sesiones</dt><dd className="tabular font-semibold">{recap.sessions}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-ink2">Pasos (media)</dt><dd className="tabular font-semibold">{recap.avgSteps !== null ? n0(recap.avgSteps) : 'Sin datos'}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-ink2">Último peso</dt><dd className="tabular font-semibold">{lastWeight ? `${n1(lastWeight.kg)} kg` : 'Sin datos'}</dd></div>
              </dl>
            </div>

            <TextField
              label="Peso de hoy (opcional)"
              inputMode="decimal"
              suffix="kg"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
              error={err.kg}
              placeholder={lastWeight ? `Último: ${n1(lastWeight.kg)}` : 'Por ejemplo: 68,4'}
              hint={todayWeight ? `Ya tienes ${n1(todayWeight.kg)} kg hoy; si escribes otro valor se sustituirá al confirmar.` : 'Se añade a tu historial; los registros anteriores no cambian.'}
              data-review-weight
            />

            <div>
              <p className="mb-2 text-[14px] font-semibold text-ink2">Medidas (opcional)</p>
              <div className="grid grid-cols-1 gap-3 xs:grid-cols-2">
                {MEASURES.map(([k, label]) => (
                  <TextField key={k} label={label} inputMode="decimal" suffix="cm" value={meas[k] ?? ''} onChange={(e) => setMeas((x) => ({ ...x, [k]: e.target.value }))} error={err[k]} />
                ))}
              </div>
            </div>

            <SelectField label="Nivel de actividad" value={prefs.activityLevel ?? ''} onChange={(e) => setP('activityLevel', (e.target.value || undefined) as UserProfile['activityLevel'])}>
              <option value="">Sin indicar</option>
              {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label} — {l.hint}</option>)}
            </SelectField>

            <SelectField label="Objetivo" value={prefs.goal ?? ''} onChange={(e) => setP('goal', (e.target.value || undefined) as Goal | undefined)}>
              <option value="">Sin indicar</option>
              {GOALS.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
            </SelectField>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-[14px] font-semibold text-ink2">Tipo de alimentación</p>
              <div className="flex flex-wrap gap-2">
                {DIETS.map((d) => <Chip key={d.value} selected={prefs.dietType === d.value} onClick={() => setP('dietType', d.value)}>{d.label}</Chip>)}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[14px] font-semibold text-ink2">Alergias e intolerancias</p>
              <div className="flex flex-wrap gap-2">
                {ALLERGENS.map((a) => (
                  <Chip key={a} selected={prefs.allergies.includes(a)} onClick={() => setP('allergies', prefs.allergies.includes(a) ? prefs.allergies.filter((x) => x !== a) : [...prefs.allergies, a as Allergen])}>
                    {ALLERGEN_LABELS[a]}
                  </Chip>
                ))}
              </div>
            </div>
            <TagInput label="Alimentos que no te gustan" values={prefs.dislikes} onChange={(v) => setP('dislikes', v)} suggestions={DISLIKE_SUGGESTIONS} placeholder="Escribe y pulsa Intro" />
            <TagInput label="Alimentos que te gustan" values={prefs.likes} onChange={(v) => setP('likes', v)} placeholder="Escribe y pulsa Intro" />
            <div>
              <p className="mb-2 text-[14px] font-semibold text-ink2">Comidas al día</p>
              <div className="flex flex-wrap gap-2">
                {ALL_SLOTS.map((s) => (
                  <Chip
                    key={s}
                    selected={prefs.mealSlots.includes(s)}
                    onClick={() => {
                      const on = prefs.mealSlots.includes(s);
                      if (on && prefs.mealSlots.length <= 1) return toast('Debe quedar al menos una comida', { tone: 'info' });
                      setP('mealSlots', on ? prefs.mealSlots.filter((x) => x !== s) : (ALL_SLOTS.filter((x) => x === s || prefs.mealSlots.includes(x)) as MealSlot[]));
                    }}
                  >
                    {SLOT_META[s].label}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-[14px] font-semibold text-ink2">Tiempo máximo por receta</p>
              <Segmented label="Tiempo máximo por receta" value={String(prefs.cookingTime ?? 60)} onChange={(v) => setP('cookingTime', Number(v) as UserProfile['cookingTime'])} options={COOK_TIMES.map((c) => ({ value: String(c.value), label: c.label }))} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            {menu.some((m) => m.conflicts.length) ? (
              <section>
                <h3 className="mb-1 flex items-center gap-2 text-[17px] font-bold"><AlertTriangle size={18} className="text-warn" /> Necesitan cambio</h3>
                <p className="mb-3 text-[14px] text-ink2">Estos platos no encajan con tus preferencias. Te proponemos una opción; puedes elegir otra.</p>
                <ul className="space-y-2">
                  {menu.filter((m) => m.conflicts.length).map((it) => (
                    <MealRow key={it.meal.id} it={it} value={decisionKey(decisionFor(it.meal.id))} onChange={(k) => setPicks((p) => ({ ...p, [it.meal.id]: k }))} />
                  ))}
                </ul>
              </section>
            ) : (
              <p className="rounded-[14px] bg-accentSoft px-4 py-3 text-[14px] text-accent-deep">Tu menú de esta semana encaja con tus preferencias.</p>
            )}

            {additions.length > 0 && (
              <section>
                <h3 className="mb-1 text-[17px] font-bold">Añadir comidas</h3>
                <p className="mb-3 text-[14px] text-ink2">Huecos sin plato desde hoy hasta el domingo.</p>
                <ul className="space-y-2">
                  {additions.map((a) => {
                    const on = isAdded(a);
                    return (
                      <li key={addKey(a)}>
                        <button
                          type="button"
                          aria-pressed={on}
                          data-addition={addKey(a)}
                          onClick={() => setAddSel((s) => ({ ...s, [addKey(a)]: !on }))}
                          className={cx('flex min-h-[52px] w-full items-center gap-3 rounded-[14px] px-3 py-2 text-left ring-1', on ? 'bg-accentSoft ring-accent' : 'ring-line hover:bg-surface2')}
                        >
                          <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', on ? 'bg-accent text-accentInk' : 'bg-surface2 text-ink3')}><Plus size={14} /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[13px] text-ink3">{formatWeekdayShort(a.date)}, {formatShort(a.date)} · {SLOT_META[a.slot].label}</span>
                            <span className="block truncate text-[15px] font-medium">{getRecipe(data, a.recipeId)?.name}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <section>
              <h3 className="mb-1 text-[17px] font-bold">Resto del menú</h3>
              <p className="mb-3 text-[14px] text-ink2">Puedes cambiar o quitar cualquier comida pendiente. Lo ya hecho no se toca.</p>
              {menu.filter((m) => !m.conflicts.length).length ? (
                <ul className="space-y-2">
                  {menu.filter((m) => !m.conflicts.length).map((it) => (
                    <MealRow key={it.meal.id} it={it} value={decisionKey(decisionFor(it.meal.id))} onChange={(k) => setPicks((p) => ({ ...p, [it.meal.id]: k }))} />
                  ))}
                </ul>
              ) : (
                <p className="text-[14px] text-ink3">No hay más comidas pendientes esta semana.</p>
              )}
            </section>
          </div>
        )}

        {step === 3 && (
          <div>
            {summary.length ? (
              <>
                <p className="mb-3 text-[15px] text-ink2">Se aplicarán estos cambios al confirmar:</p>
                <ul className="space-y-2" data-review-summary>
                  {summary.map((s, i) => (
                    <li key={i} className="rounded-[12px] bg-surface2 px-3.5 py-2.5 text-[15px] leading-snug">{s}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="rounded-[14px] bg-surface2 px-4 py-3 text-[15px] text-ink2" data-review-summary>No has cambiado nada. Puedes confirmar la revisión para esta semana tal como está.</p>
            )}
            <p className="mt-4 text-[13px] text-ink3">Los registros de semanas anteriores no se modifican. Puedes volver a revisar desde Perfil cuando quieras.</p>
            {data.weeklyReview?.lastCompleted && data.weeklyReview.lastCompleted < monday && (
              <p className="mt-1 text-[13px] text-ink3">Última revisión: semana del {formatDate(data.weeklyReview.lastCompleted)}.</p>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
}

function MealRow({ it, value, onChange }: { it: ReturnType<typeof reviewMenu>[number]; value: string; onChange: (k: string) => void }) {
  const data = useData();
  const name = getRecipe(data, it.meal.recipeId)?.name ?? it.meal.customName ?? 'Plato';
  const id = `dec-${it.meal.id}`;
  return (
    <li className={cx('rounded-[14px] p-3 ring-1', it.conflicts.length ? 'ring-warn/50' : 'ring-line')} data-review-meal={it.meal.id}>
      <p className="text-[13px] text-ink3">{formatWeekdayShort(it.meal.date)}, {formatShort(it.meal.date)} · {SLOT_META[it.meal.slot].label}</p>
      <p className="text-[15px] font-semibold">{name}</p>
      {it.conflicts.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {it.conflicts.map((c) => <Badge key={c} tone="warn">{c}</Badge>)}
        </div>
      )}
      <label htmlFor={id} className="sr-only">Qué hacer con {name}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 h-11 w-full min-w-0 rounded-[10px] bg-surface2 px-3 text-[16px] text-ink"
      >
        {it.options.map((o) => (
          <option key={decisionKey(o)} value={decisionKey(o)}>{optionLabel(o)}</option>
        ))}
      </select>
      {(() => {
        const sel = it.options.find((o) => decisionKey(o) === value);
        return sel && sel.kind !== 'keep' ? <p className="mt-1.5 text-[13px] leading-snug text-accent-deep">{optionLabel(sel)}</p> : null;
      })()}
    </li>
  );
}

