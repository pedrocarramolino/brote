import { useMemo, useState } from 'react';
import { Activity, ChevronLeft, ChevronRight, Footprints, Plus, Scale, Sparkles } from 'lucide-react';
import type { FoodLogEntry, MealSlot, PlannedMeal } from '../types';
import { PageHeader } from '../components/layout/AppShell';
import { Card, IconButton, ProgressBar, SectionTitle } from '../components/ui/primitives';
import { DemoBanner } from '../components/DemoBanner';
import { useData, useWeek } from '../store/AppStore';
import { addDays, formatDate, formatLong, greeting, startOfWeek, todayISO, weekdayIndex } from '../lib/dates';
import { n0, n1 } from '../lib/format';
import { navigate } from '../lib/router';
import { getRecipe, SLOT_META, slotsOrdered } from '../services/catalog';
import { dayTotals } from '../services/nutrition';
import { NutritionSummary } from '../features/today/NutritionSummary';
import { MealTimeline } from '../features/today/MealTimeline';
import { HabitsCard } from '../features/today/HabitsCard';
import { RecipeSheet } from '../features/meals/RecipeSheet';
import { SwapSheet } from '../features/meals/SwapSheet';
import { LogFoodSheet } from '../features/log/LogFoodSheet';
import { PhotoLogSheet } from '../features/log/PhotoLogSheet';
import { StepsSheet } from '../features/activity/StepsSheet';

/** Comida que toca según la hora y los horarios del usuario. */
function currentSlot(slots: MealSlot[], schedule: Partial<Record<MealSlot, string>>): MealSlot {
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  let pick = slots[0];
  for (const s of slots) {
    const [h, m] = (schedule[s] ?? SLOT_META[s].time).split(':').map(Number);
    if (mins >= h * 60 + m - 45) pick = s;
  }
  return pick;
}

export function TodayPage({ dateParam }: { dateParam: string | null }) {
  const data = useData();
  const today = todayISO();
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;
  const isToday = date === today;
  const weekMeals = useWeek(startOfWeek(date));
  const meals = useMemo(() => weekMeals.filter((m) => m.date === date), [weekMeals, date]);
  const totals = dayTotals(data, date);
  const slots = slotsOrdered(data.profile.mealSlots);

  const [recipeMeal, setRecipeMeal] = useState<PlannedMeal | null>(null);
  const [swapMeal, setSwapMeal] = useState<PlannedMeal | null>(null);
  const [logSlot, setLogSlot] = useState<MealSlot | null>(null);
  const [editLog, setEditLog] = useState<FoodLogEntry | null>(null);
  const [photoSlot, setPhotoSlot] = useState<MealSlot | null>(null);
  const [stepsOpen, setStepsOpen] = useState(false);

  const liveRecipeMeal = recipeMeal ? meals.find((m) => m.id === recipeMeal.id) ?? recipeMeal : null;
  const liveSwapMeal = swapMeal ? meals.find((m) => m.id === swapMeal.id) ?? swapMeal : null;
  const defaultSlot = isToday ? currentSlot(slots, data.profile.schedule) : slots[0];

  const goDay = (d: string) => navigate('hoy', d === today ? undefined : { d });

  // Actividad
  const steps = data.steps.find((s) => s.date === date)?.steps;
  const planDay = data.activityPlan.find((p) => p.weekday === weekdayIndex(date));
  const sessionsToday = data.sessions.filter((s) => s.date === date);
  const lastWeight = [...data.weights].filter((w) => w.date <= date).sort((a, b) => b.date.localeCompare(a.date))[0];

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-0.5">
            <IconButton label="Día anterior" className="!-ml-3 !h-9 !w-9" onClick={() => goDay(addDays(date, -1))}>
              <ChevronLeft size={18} />
            </IconButton>
            <span aria-live="polite">{formatLong(date)}</span>
            <IconButton label="Día siguiente" className="!h-9 !w-9" onClick={() => goDay(addDays(date, 1))}>
              <ChevronRight size={18} />
            </IconButton>
            {!isToday && (
              <button type="button" className="ml-1 h-8 rounded-full bg-accentSoft px-3 text-[13px] font-semibold text-accent-deep" onClick={() => goDay(today)}>
                Volver a hoy
              </button>
            )}
          </span>
        }
        title={isToday ? `${greeting()}${data.profile.name ? `, ${data.profile.name}` : ''}` : 'Resumen del día'}
        actions={
          <>
            <IconButton label="Abrir asistente nutricional" variant="secondary" onClick={() => navigate('asistente')}>
              <Sparkles size={20} />
            </IconButton>
            <IconButton label="Registrar alimento" variant="primary" onClick={() => setLogSlot(defaultSlot)}>
              <Plus size={22} />
            </IconButton>
          </>
        }
      />

      <DemoBanner />

      <div className="grid gap-x-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <NutritionSummary totals={totals} targets={data.profile.targets} />

          <SectionTitle
            action={
              <button type="button" className="press h-9 rounded-full px-3 text-[14px] font-semibold text-accent hover:bg-accentSoft/60" onClick={() => navigate('plan', { d: date })}>
                Ver semana
              </button>
            }
          >
            Comidas del día
          </SectionTitle>
          <MealTimeline
            date={date}
            meals={meals}
            onOpenRecipe={setRecipeMeal}
            onSwap={setSwapMeal}
            onAddFood={(s) => setLogSlot(s)}
            onEditLog={(e) => setEditLog(e)}
          />
        </div>

        <aside className="min-w-0 xl:pt-0">
          <div className="mt-7 xl:mt-0">
            <HabitsCard date={date} onSteps={() => setStepsOpen(true)} />
          </div>

          <SectionTitle>Actividad</SectionTitle>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-1">
            <Card as="div" className="p-0">
              <button type="button" onClick={() => setStepsOpen(true)} className="w-full rounded-xl2 p-4 text-left hover:bg-surface2/40">
                <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-ink2"><Footprints size={16} /> Pasos</div>
                {steps !== undefined ? (
                  <>
                    <p className="tabular text-[24px] font-bold leading-none">{n0(steps)}</p>
                    <p className="mb-2 mt-1 text-[13px] text-ink3">de {n0(data.profile.stepsTarget)}</p>
                    <ProgressBar value={steps} max={data.profile.stepsTarget} label="Pasos" height={5} />
                  </>
                ) : (
                  <p className="text-[15px] text-ink2">Sin registrar. <span className="font-semibold text-accent">Añadir</span></p>
                )}
              </button>
            </Card>
            <Card as="div" className="p-0">
              <button type="button" onClick={() => navigate('actividad')} className="w-full rounded-xl2 p-4 text-left hover:bg-surface2/40">
                <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-ink2"><Activity size={16} /> Actividad física</div>
                {sessionsToday.length ? (
                  <>
                    <p className="text-[16px] font-bold leading-snug">{sessionsToday.map((s) => s.title).join(' · ')}</p>
                    <p className="mt-1 text-[13px] text-accent-deep">Completada · {sessionsToday.reduce((a, s) => a + s.minutes, 0)} min</p>
                  </>
                ) : planDay && planDay.type !== 'descanso' ? (
                  <>
                    <p className="text-[16px] font-bold leading-snug">{planDay.title}</p>
                    <p className="mt-1 text-[13px] text-ink3">Planificada · {planDay.minutes} min</p>
                  </>
                ) : (
                  <p className="text-[15px] text-ink2">Día de descanso</p>
                )}
              </button>
            </Card>
            <Card as="div" className="col-span-2 p-0 xl:col-span-1">
              <button type="button" onClick={() => navigate('progreso')} className="flex w-full items-center gap-3 rounded-xl2 p-4 text-left hover:bg-surface2/40">
                <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-surface2 text-ink2"><Scale size={19} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-ink2">Peso más reciente</span>
                  {lastWeight ? (
                    <span className="tabular block text-[17px] font-bold">
                      {n1(lastWeight.kg)} kg <span className="text-[13px] font-medium text-ink3">· {formatDate(lastWeight.date)}</span>
                    </span>
                  ) : (
                    <span className="block text-[15px] text-ink2">Sin registros</span>
                  )}
                </span>
                <ChevronRight size={18} className="text-ink3" />
              </button>
            </Card>
          </div>

          <Card className="mt-3 p-0">
            <button type="button" onClick={() => navigate('asistente')} className="flex w-full items-center gap-3 rounded-xl2 p-4 text-left hover:bg-surface2/40">
              <span className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-accentSoft text-accent-deep"><Sparkles size={19} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-semibold">¿Qué ceno hoy?</span>
                <span className="block text-[13px] text-ink2">Pregunta al asistente con tu plan como contexto</span>
              </span>
              <ChevronRight size={18} className="text-ink3" />
            </button>
          </Card>
        </aside>
      </div>

      <RecipeSheet
        recipe={liveRecipeMeal ? getRecipe(data, liveRecipeMeal.recipeId) : undefined}
        meal={liveRecipeMeal ?? undefined}
        open={!!liveRecipeMeal}
        onClose={() => setRecipeMeal(null)}
        onSwap={() => {
          setSwapMeal(liveRecipeMeal);
          setRecipeMeal(null);
        }}
      />
      <SwapSheet meal={liveSwapMeal} open={!!liveSwapMeal} onClose={() => setSwapMeal(null)} />
      <LogFoodSheet
        open={!!logSlot || !!editLog}
        onClose={() => {
          setLogSlot(null);
          setEditLog(null);
        }}
        date={date}
        slot={editLog?.slot ?? logSlot ?? defaultSlot}
        editEntry={editLog}
        onOpenPhoto={() => {
          setPhotoSlot(logSlot ?? defaultSlot);
          setLogSlot(null);
        }}
      />
      <PhotoLogSheet open={!!photoSlot} onClose={() => setPhotoSlot(null)} date={date} slot={photoSlot ?? defaultSlot} />
      <StepsSheet open={stepsOpen} onClose={() => setStepsOpen(false)} date={date} />
    </>
  );
}
