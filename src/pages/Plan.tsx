import { useMemo, useState } from 'react';
import { ArrowLeftRight, ChevronLeft, ChevronRight, Clock, Heart, Search, Sparkles } from 'lucide-react';
import type { MealSlot, PlannedMeal, Recipe } from '../types';
import { PageHeader } from '../components/layout/AppShell';
import { Badge, Button, Card, Chip, EmptyState, IconButton, ProgressBar, SectionTitle, Segmented, cx } from '../components/ui/primitives';
import { useData, useWeek } from '../store/AppStore';
import { addDays, formatLong, formatWeekRange, formatWeekdayShort, fromISO, startOfWeek, todayISO, weekDates } from '../lib/dates';
import { n0, normalize } from '../lib/format';
import { navigate } from '../lib/router';
import { ALL_SLOTS, allRecipes, getRecipe, SLOT_META, slotsOrdered } from '../services/catalog';
import { addMacros, plannedMealNutrition, recipeFit, recipeNutrition, ZERO } from '../services/nutrition';
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

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="mb-3 flex items-end justify-between gap-3 px-1">
            <div>
              <h2 className="text-[20px] font-bold tracking-tight">{formatLong(selected)}</h2>
              <p className="text-[14px] text-ink2">{done} de {dayMeals.length} platos completados</p>
            </div>
            {selected !== today && (
              <Button size="sm" variant="secondary" onClick={() => navigate('hoy', { d: selected })}>Abrir en Hoy</Button>
            )}
          </div>

          {dayMeals.length === 0 ? (
            <Card><EmptyState icon={<Clock size={24} />} title="Generando el menú…">El menú de la semana se crea automáticamente según tus preferencias.</EmptyState></Card>
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
                          <span className="block text-[12px] font-semibold uppercase tracking-wide text-ink3">
                            {SLOT_META[slot].label} · {data.profile.schedule[slot] ?? SLOT_META[slot].time}
                          </span>
                          <span className="mt-0.5 block text-[16px] font-semibold leading-snug">{r?.name ?? m.customName}</span>
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

      <RecipeCatalog onOpen={(r) => setRecipeView({ recipe: r })} />

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

function RecipeCatalog({ onOpen }: { onOpen: (r: Recipe) => void }) {
  const data = useData();
  const [q, setQ] = useState('');
  const [mode, setMode] = useState<'todas' | 'favoritas'>('todas');
  const [slot, setSlot] = useState<MealSlot | null>(null);

  const list = useMemo(() => {
    const nq = normalize(q.trim());
    return allRecipes(data)
      .filter((r) => !r.custom)
      .filter((r) => (mode === 'favoritas' ? data.favorites.recipes.includes(r.id) : true))
      .filter((r) => (slot ? r.slots.includes(slot) : true))
      .filter((r) => (nq ? normalize(r.name).includes(nq) : true));
  }, [data, q, mode, slot]);

  return (
    <section className="mt-2" aria-labelledby="recetas-title">
      <SectionTitle id="recetas-title">Recetas</SectionTitle>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex h-11 flex-1 items-center gap-2 rounded-[12px] bg-surface px-3 ring-1 ring-line/70 focus-within:ring-2 focus-within:ring-accent">
          <Search size={18} className="text-ink3" aria-hidden="true" />
          <span className="sr-only">Buscar receta</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar receta" className="h-full w-full bg-transparent text-[16px] placeholder:text-ink3 focus:outline-none" />
        </label>
        <Segmented className="sm:w-60" label="Mostrar" value={mode} onChange={setMode} options={[{ value: 'todas', label: 'Todas' }, { value: 'favoritas', label: 'Favoritas' }]} />
      </div>
      <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip selected={slot === null} onClick={() => setSlot(null)}>Todas</Chip>
        {ALL_SLOTS.map((s) => (
          <Chip key={s} selected={slot === s} onClick={() => setSlot(slot === s ? null : s)}>{SLOT_META[s].label}</Chip>
        ))}
      </div>

      {list.length === 0 ? (
        <Card>
          <EmptyState icon={mode === 'favoritas' ? <Heart size={24} /> : <Search size={24} />} title={mode === 'favoritas' ? 'Sin favoritas todavía' : 'Sin resultados'}>
            {mode === 'favoritas' ? 'Abre una receta y pulsa el corazón para guardarla aquí.' : 'Prueba con otro nombre o quita el filtro.'}
          </EmptyState>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((r) => {
            const fit = recipeFit(data, r, data.profile);
            const m = recipeNutrition(data, r).macros;
            return (
              <li key={r.id}>
                <button type="button" onClick={() => onOpen(r)} className="press flex w-full items-center gap-3 rounded-xl2 bg-surface p-3 text-left shadow-card ring-1 ring-line/60 hover:bg-surface2/40">
                  <RecipeCover recipe={r} size={64} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold leading-snug">{r.name}</span>
                    <span className="tabular mt-0.5 block text-[13px] text-ink2">{n0(m.kcal)} kcal · {r.minutes} min</span>
                    <span className="mt-1 flex flex-wrap gap-1">
                      {data.favorites.recipes.includes(r.id) && <Badge tone="accent">Favorita</Badge>}
                      {!fit.ok && <Badge tone="danger">{fit.reasons[0]}</Badge>}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
