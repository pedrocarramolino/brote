import { useState } from 'react';
import { ArrowLeftRight, BookOpen, Plus, CheckCheck, ChevronLeft, ChevronRight, Clock, Info, Lock, RefreshCw, Shuffle, Sparkles } from 'lucide-react';
import type { PlannedMeal, Recipe } from '../types';
import { PageHeader } from '../components/layout/AppShell';
import { Button, Card, EmptyState, IconButton, ProgressBar, SectionTitle, cx } from '../components/ui/primitives';
import { useData, useStore, useWeek } from '../store/AppStore';
import { useFeedback } from '../components/ui/Feedback';
import { acceptWeek, planDiagnostics, regenerateDay, regenerateWeek } from '../services/planner';
import { recipeSubtitle, recipeTitle } from '../services/recipeMeta';
import { addDays, formatLong, formatWeekRange, formatWeekdayShort, fromISO, startOfWeek, todayISO, weekDates } from '../lib/dates';
import { n0 } from '../lib/format';
import { navigate } from '../lib/router';
import { allRecipes, getRecipe, SLOT_META, slotsOrdered } from '../services/catalog';
import { addMacros, plannedMealNutrition, ZERO } from '../services/nutrition';
import { trackingStart } from '../services/habits';
import { MacroInline, RecipeCover } from '../features/meals/RecipeBits';
import { RecipeSheet } from '../features/meals/RecipeSheet';
import { SwapSheet } from '../features/meals/SwapSheet';
import { StatusNode } from '../features/today/MealTimeline';
import { useMealActions } from '../features/meals/useMealActions';

export function PlanPage({ dateParam }: { dateParam: string | null }) {
  const data = useData();
  const today = todayISO();
  const selected = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;
  const monday = startOfWeek(selected);
  const weekMeals = useWeek(monday);
  const { toggleDone } = useMealActions();
  const { mutate } = useStore();
  const { toast, confirm } = useFeedback();
  const slots = slotsOrdered(data.profile.mealSlots);

  const [recipeView, setRecipeView] = useState<{ recipe: Recipe; meal?: PlannedMeal } | null>(null);
  const [swapMeal, setSwapMeal] = useState<PlannedMeal | null>(null);

  const select = (d: string) => navigate('plan', { d });
  const dayMeals = weekMeals.filter((m) => m.date === selected && data.profile.mealSlots.includes(m.slot));
  const plannedTotal = dayMeals.reduce((acc, m) => {
    const n = plannedMealNutrition(data, m).macros;
    return n ? addMacros(acc, n) : acc;
  }, ZERO);
  const done = dayMeals.filter((m) => m.status === 'hecha').length;

  const pendingDay = dayMeals.filter((m) => m.status === 'pendiente');
  const changeDay = async () => {
    if (!pendingDay.length) return;
    const ok = await confirm({
      title: 'Cambiar el día entero',
      message: `Se propondrán platos nuevos para las ${pendingDay.length} comidas pendientes del ${formatLong(selected).toLowerCase()}. El resto de la semana no cambia.`,
      confirmLabel: 'Cambiar día',
    });
    if (!ok) return;
    const before = structuredClone(data.plan[monday] ?? []);
    const beforeRep = data.replacements?.length ?? 0;
    const draft = structuredClone(data);
    const n = regenerateDay(draft, selected, `dia-${Date.now()}`);
    mutate((d) => { d.plan[monday] = draft.plan[monday]; d.replacements = draft.replacements; });
    toast(n ? `Día renovado: ${n} ${n === 1 ? 'plato nuevo' : 'platos nuevos'}` : 'No hay más opciones compatibles para este día', {
      action: { label: 'Deshacer', onClick: () => mutate((d) => { d.plan[monday] = before; d.replacements?.splice(beforeRep); }) },
    });
  };

  const liveMeal = recipeView?.meal ? weekMeals.find((m) => m.id === recipeView.meal!.id) : undefined;
  const liveSwap = swapMeal ? weekMeals.find((m) => m.id === swapMeal.id) ?? swapMeal : null;

  return (
    <>
      <PageHeader
        title="Plan"
        subtitle="Tu menú semanal, recetas y sustituciones"
        actions={
          <IconButton label="Preguntar al asistente" variant="secondary" onClick={() => navigate('asistente')}>
            <Sparkles size={20} />
          </IconButton>
        }
      />

      {/* Navegación semanal */}
      <Card className="p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <IconButton label="Semana anterior" onClick={() => select(addDays(monday, -7))}>
            <ChevronLeft size={20} />
          </IconButton>
          <div className="text-center">
            <p className="text-[16px] font-bold" aria-live="polite">{formatWeekRange(monday)}</p>
            {monday !== startOfWeek(today) ? (
              <button type="button" className="text-[13px] font-semibold text-accent" onClick={() => select(today)}>Ir a esta semana</button>
            ) : (
              <p className="text-[13px] text-ink3">Esta semana</p>
            )}
          </div>
          <IconButton label="Semana siguiente" onClick={() => select(addDays(monday, 7))}>
            <ChevronRight size={20} />
          </IconButton>
        </div>
        <div className="grid grid-cols-7 gap-1" role="tablist" aria-label="Días de la semana">
          {weekDates(monday).map((d) => {
            const meals = weekMeals.filter((m) => m.date === d && data.profile.mealSlots.includes(m.slot));
            const pct = meals.length ? meals.filter((m) => m.status === 'hecha').length / meals.length : 0;
            const active = d === selected;
            const isToday = d === today;
            return (
              <button
                key={d}
                type="button"
                role="tab"
                aria-selected={active}
                aria-label={`${formatLong(d)}, ${Math.round(pct * 100)} % completado`}
                onClick={() => select(d)}
                className={cx('press flex flex-col items-center gap-1 rounded-[14px] py-2 transition-colors', active ? 'bg-accent text-accentInk' : 'hover:bg-surface2')}
              >
                <span className={cx('text-[12px] font-semibold', active ? 'text-accentInk/85' : isToday ? 'text-accent' : 'text-ink3')}>{formatWeekdayShort(d)}</span>
                <span className="tabular text-[18px] font-bold leading-none">{fromISO(d).getDate()}</span>
                <span className={cx('mt-0.5 h-1 w-6 overflow-hidden rounded-full', active ? 'bg-accentInk/25' : 'bg-surface2')} aria-hidden="true">
                  <span className={cx('block h-full rounded-full', active ? 'bg-accentInk' : 'bg-accent')} style={{ width: `${pct * 100}%` }} />
                </span>
              </button>
            );
          })}
        </div>
      </Card>

      <WeekActions monday={monday} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="mb-3 flex items-end justify-between gap-3 px-1">
            <div>
              <h2 className="text-[20px] font-bold tracking-tight">{formatLong(selected)}</h2>
              <p className="text-[14px] text-ink2">{done} de {dayMeals.length} platos completados</p>
            </div>
            <div className="flex shrink-0 gap-2">
              {pendingDay.length > 0 && selected >= today && (
                <Button size="sm" variant="secondary" icon={<Shuffle size={16} />} onClick={changeDay} data-change-day>
                  Cambiar día
                </Button>
              )}
              {selected !== today && (
                <Button size="sm" variant="secondary" onClick={() => navigate('hoy', { d: selected })}>Abrir en Hoy</Button>
              )}
            </div>
          </div>

          {dayMeals.length === 0 ? (
            <Card>
              {selected < trackingStart(data) ? (
                <EmptyState icon={<Clock size={24} />} title="Sin plan este día">Tu plan empieza el {formatLong(trackingStart(data)).toLowerCase()}.</EmptyState>
              ) : (
                <EmptyState icon={<Clock size={24} />} title="Generando el menú…">El menú de la semana se crea automáticamente según tus preferencias.</EmptyState>
              )}
            </Card>
          ) : (
            <ul className="space-y-3">
              {slots.map((slot) => {
                const m = dayMeals.find((x) => x.slot === slot);
                if (!m) return null;
                const r = getRecipe(data, m.recipeId);
                const n = plannedMealNutrition(data, m).macros;
                return (
                  <li key={slot}>
                    <Card as="article" className={cx('flex items-center gap-3 p-3 sm:gap-4', m.status === 'omitida' && 'opacity-60')}>
                      <button type="button" disabled={!r} onClick={() => r && setRecipeView({ recipe: r, meal: m })} className="flex min-w-0 flex-1 items-center gap-3 rounded-[14px] text-left sm:gap-4">
                        <RecipeCover recipe={r} size={68} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1 text-[12px] font-semibold uppercase tracking-wide text-ink3">
                            {SLOT_META[slot].label} · {data.profile.schedule[slot] ?? SLOT_META[slot].time}
                            {m.accepted && m.status === 'pendiente' && <Lock size={11} className="text-accent" aria-label="Aceptado" />}
                          </span>
                          <span className="mt-0.5 block text-[16px] font-semibold leading-snug">{r ? recipeTitle(r) : m.customName}</span>
                          {r && recipeSubtitle(r) && <span className="block truncate text-[13px] leading-snug text-ink3">{recipeSubtitle(r)}</span>}
                          {n ? <MacroInline m={n} className="mt-0.5" /> : <span className="mt-0.5 block text-[13px] text-warn">Sin valores verificados</span>}
                        </span>
                      </button>
                      <div className="flex shrink-0 flex-col items-center gap-1 sm:flex-row sm:gap-2">
                        <IconButton label={`Cambiar ${SLOT_META[slot].label.toLowerCase()}`} variant="ghost" onClick={() => setSwapMeal(m)}>
                          <ArrowLeftRight size={19} />
                        </IconButton>
                        <div className="flex h-11 w-11 items-center justify-center">
                          <StatusNode meal={m} onToggle={() => toggleDone(m)} size={28} />
                        </div>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside>
          <Card className="p-5 lg:sticky lg:top-6">
            <h3 className="text-[15px] font-semibold text-ink2">Previsto para el día</h3>
            <p className="tabular mt-1 text-[30px] font-bold leading-tight tracking-tight">{n0(plannedTotal.kcal)} <span className="text-[16px] font-semibold text-ink3">kcal</span></p>
            {data.profile.targets.kcal && <p className="text-[13px] text-ink3">Objetivo: {n0(data.profile.targets.kcal)} kcal</p>}
            <div className="mt-4 space-y-3">
              {([
                ['Proteínas', plannedTotal.protein, data.profile.targets.protein, 'rgb(var(--protein))'],
                ['Hidratos', plannedTotal.carbs, data.profile.targets.carbs, 'rgb(var(--carbs))'],
                ['Grasas', plannedTotal.fat, data.profile.targets.fat, 'rgb(var(--fat))'],
              ] as const).map(([label, v, t, c]) => (
                <div key={label}>
                  <div className="mb-1 flex justify-between text-[14px]"><span className="font-medium">{label}</span><span className="tabular text-ink2">{n0(v)}{t ? ` / ${n0(t)}` : ''} g</span></div>
                  <ProgressBar value={v} max={t || Math.max(v, 1)} color={t ? c : 'rgb(var(--line))'} label={label} />
                </div>
              ))}
            </div>
            <p className="mt-4 text-[12px] leading-snug text-ink3">Calculado a partir de los ingredientes de cada receta. Los platos sin datos verificados no se suman.</p>
          </Card>
        </aside>
      </div>

      <LibraryLink />

      <RecipeSheet
        recipe={liveMeal ? getRecipe(data, liveMeal.recipeId) : recipeView?.recipe}
        meal={liveMeal}
        open={!!recipeView}
        onClose={() => setRecipeView(null)}
        onSwap={liveMeal ? () => { setSwapMeal(liveMeal); setRecipeView(null); } : undefined}
      />
      <SwapSheet meal={liveSwap} open={!!liveSwap} onClose={() => setSwapMeal(null)} />
    </>
  );
}

function LibraryLink() {
  const data = useData();
  const total = allRecipes(data).filter((r) => !r.custom).length;
  const favs = data.favorites.recipes.map((id) => getRecipe(data, id)).filter((r): r is Recipe => !!r);
  return (
    <section className="mt-2" aria-labelledby="recetas-title">
      <SectionTitle id="recetas-title">Recetas</SectionTitle>
      <button type="button" onClick={() => navigate('recetas', undefined, { push: true })} className="press flex w-full items-center gap-3 rounded-xl2 bg-surface p-4 text-left shadow-card ring-1 ring-line/60 hover:bg-surface2/40" data-open-library>
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-accentSoft text-accent-deep"><BookOpen size={24} /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold">Biblioteca de recetas</span>
          <span className="block text-[14px] text-ink2">{total} recetas con filtros por comida, tiempo, ingrediente, proteína y calorías{favs.length ? ` · ${favs.length} favoritas` : ''}</span>
        </span>
        <ChevronRight size={20} className="shrink-0 text-ink3" />
      </button>
      <Button variant="secondary" className="mt-2 w-full" icon={<Plus size={18} />} onClick={() => navigate('recetas', { nuevo: '1' }, { push: true })} data-plan-create-dish>
        Crear mi plato{data.customRecipes.length ? ` · ${data.customRecipes.length} guardados` : ''}
      </Button>
    </section>
  );
}

/** Acciones sobre la propuesta de la semana: aceptar, pedir otra propuesta y avisos de limitaciones. */
function WeekActions({ monday }: { monday: string }) {
  const data = useData();
  const { mutate } = useStore();
  const { toast, confirm } = useFeedback();
  const today = todayISO();
  const from = monday > today ? monday : today;
  const meals = (data.plan[monday] ?? []).filter((m) => data.profile.mealSlots.includes(m.slot) && m.date >= from && m.status === 'pendiente');
  if (!meals.length) return null;
  const accepted = meals.filter((m) => m.accepted).length;
  const open = meals.length - accepted;
  const diag = planDiagnostics(data, monday);

  const accept = () => {
    const before = structuredClone(data.plan[monday]);
    mutate((d) => void acceptWeek(d, monday));
    toast('Menú aceptado: no cambiará al pedir otra propuesta', { action: { label: 'Deshacer', onClick: () => mutate((d) => void (d.plan[monday] = before)) } });
  };
  const regenerate = async () => {
    const ok = await confirm({
      title: 'Nueva propuesta',
      message: accepted
        ? `Se cambiarán los ${open} platos pendientes que aún no has aceptado. Los ${accepted} aceptados y los ya hechos se mantienen.`
        : `Se propondrán platos nuevos para los ${open} platos pendientes de esta semana. Los ya hechos se mantienen.`,
      confirmLabel: 'Generar',
    });
    if (!ok) return;
    const before = structuredClone(data.plan[monday]);
    const beforeRep = data.replacements?.length ?? 0;
    const draft = structuredClone(data);
    const n = regenerateWeek(draft, monday, from, `semana-${Date.now()}`);
    mutate((d) => { d.plan[monday] = draft.plan[monday]; d.replacements = draft.replacements; });
    toast(n ? `Nueva propuesta: ${n} ${n === 1 ? 'plato cambiado' : 'platos cambiados'}` : 'No hay más opciones compatibles', {
      action: { label: 'Deshacer', onClick: () => mutate((d) => { d.plan[monday] = before; d.replacements?.splice(beforeRep); }) },
    });
  };

  return (
    <section className="mt-3 rounded-xl2 bg-surface px-4 py-3 shadow-card ring-1 ring-line/60" aria-label="Propuesta de la semana" data-week-actions>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <p className="min-w-0 text-[14px] leading-snug text-ink2 sm:flex-1">
          <span className="font-semibold text-ink">{open === 0 ? 'Menú aceptado' : 'Propuesta de la semana'}</span>
          <span className="tabular"> · {accepted} de {meals.length} platos pendientes aceptados</span>
        </p>
        <div className="flex gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
          <Button size="sm" variant="secondary" icon={<RefreshCw size={16} />} onClick={regenerate} disabled={open === 0} data-regenerate-week>
            Otra propuesta
          </Button>
          <Button size="sm" variant={open ? 'primary' : 'tinted'} icon={<CheckCheck size={16} />} onClick={accept} disabled={open === 0} data-accept-week>
            {open ? 'Aceptar menú' : 'Aceptado'}
          </Button>
        </div>
      </div>
      {diag.notes.length > 0 && (
        <ul className="mt-2 space-y-1 text-[13px] leading-snug text-ink3" data-plan-notes>
          {diag.notes.map((n) => (
            <li key={n} className="flex items-start gap-1.5"><Info size={14} className="mt-[2px] shrink-0" />{n}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
