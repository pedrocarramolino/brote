import { useEffect, useMemo, useState } from 'react';
import { CalendarPlus } from 'lucide-react';
import type { MealSlot, Recipe } from '../../types';
import { Sheet } from '../../components/ui/Sheet';
import { Button, Chip, cx } from '../../components/ui/primitives';
import { useFeedback } from '../../components/ui/Feedback';
import { useData, useStore } from '../../store/AppStore';
import { addDays, formatLong, formatWeekdayShort, fromISO, startOfWeek, todayISO } from '../../lib/dates';
import { n0, uid } from '../../lib/format';
import { getRecipe, SLOT_META, slotsOrdered } from '../../services/catalog';
import { addMacros, plannedMealNutrition, recipeFit, recipeNutrition, ZERO } from '../../services/nutrition';
import { generateWeek, logReplacement } from '../../services/planner';
import { recipeSubtitle, recipeTitle } from '../../services/recipeMeta';
import { RecipeCover } from './RecipeBits';

/**
 * Elegir día y comida para añadir una receta de la biblioteca al menú.
 * El menú NO cambia hasta pulsar «Añadir». Solo se toca la comida elegida.
 */
export function AddToPlanSheet({ recipe, open, onClose, source = 'manual' }: { recipe: Recipe | null; open: boolean; onClose: () => void; source?: 'manual' | 'sorpresa' }) {
  const data = useData();
  const { mutate } = useStore();
  const { toast } = useFeedback();
  const today = todayISO();
  const days = useMemo(() => Array.from({ length: 14 }, (_, i) => addDays(today, i)), [today]);
  const slots = recipe ? slotsOrdered(recipe.slots.filter((s) => data.profile.mealSlots.includes(s))) : [];
  const allSlots = slotsOrdered(data.profile.mealSlots);
  const usable = slots.length ? slots : allSlots;
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<MealSlot>(usable[0] ?? 'comida');

  useEffect(() => {
    if (open) {
      setDate(today);
      setSlot(usable[0] ?? 'comida');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, recipe?.id]);

  if (!recipe) return null;
  const monday = startOfWeek(date);
  const week = data.plan[monday] ?? [];
  const current = week.find((m) => m.date === date && m.slot === slot);
  const currentRecipe = current ? getRecipe(data, current.recipeId) : undefined;
  const portion = current?.portion ?? 1;
  const dayMeals = week.filter((m) => m.date === date && data.profile.mealSlots.includes(m.slot));
  const dayBefore = dayMeals.reduce((a, m) => addMacros(a, plannedMealNutrition(data, m).macros ?? ZERO), ZERO);
  const curKcal = current ? plannedMealNutrition(data, current).macros?.kcal ?? 0 : 0;
  const newKcal = recipeNutrition(data, recipe, portion).macros.kcal;
  const dayAfter = dayBefore.kcal - curKcal + newKcal;
  const fit = recipeFit(data, recipe, data.profile);
  const done = current && current.status !== 'pendiente';

  const confirm = () => {
    const before = data.plan[monday] ? structuredClone(data.plan[monday]) : undefined;
    const beforeRep = data.replacements?.length ?? 0;
    mutate((d) => {
      d.plan[monday] ??= generateWeek(d, monday);
      const m = d.plan[monday].find((x) => x.date === date && x.slot === slot);
      if (m) {
        logReplacement(d, { date, slot, fromRecipeId: m.recipeId, toRecipeId: recipe.id, source });
        m.recipeId = recipe.id;
        delete m.customName;
        delete m.swaps;
        delete m.free;
        m.status = 'pendiente';
        m.accepted = true;
      } else {
        logReplacement(d, { date, slot, fromRecipeId: null, toRecipeId: recipe.id, source });
        d.plan[monday].push({ id: uid('pm'), date, slot, recipeId: recipe.id, portion: 1, status: 'pendiente', accepted: true });
      }
    });
    toast(`${recipeTitle(recipe)} añadida al ${SLOT_META[slot].label.toLowerCase()} del ${formatWeekdayShort(date).toLowerCase()} ${fromISO(date).getDate()}`, {
      action: {
        label: 'Deshacer',
        onClick: () =>
          mutate((d) => {
            if (before) d.plan[monday] = before;
            else delete d.plan[monday];
            d.replacements?.splice(beforeRep);
          }),
      },
    });
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Añadir al menú"
      subtitle={recipeTitle(recipe)}
      footer={
        <Button className="w-full" icon={<CalendarPlus size={18} />} onClick={confirm} disabled={!!done} data-confirm-add>
          {current ? 'Sustituir y añadir' : 'Añadir'}
        </Button>
      }
    >
      <div className="mb-4 flex items-center gap-3">
        <RecipeCover recipe={recipe} size={56} />
        <div className="min-w-0">
          <p className="text-[16px] font-semibold leading-snug">{recipeTitle(recipe)}</p>
          {recipeSubtitle(recipe) && <p className="truncate text-[13px] text-ink3">{recipeSubtitle(recipe)}</p>}
        </div>
      </div>
      {!fit.ok && <p className="mb-3 rounded-[12px] bg-warnSoft px-3 py-2 text-[13px] text-warn">Atención: {fit.reasons.join(' · ')}.</p>}

      <h3 className="mb-2 text-[14px] font-semibold text-ink2">Día</h3>
      <div className="no-scrollbar -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1" data-no-swipe>
        {days.map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDate(d)}
            aria-pressed={d === date}
            className={cx('press flex w-12 shrink-0 flex-col items-center rounded-[12px] py-1.5', d === date ? 'bg-accent text-accentInk' : 'bg-surface2 text-ink')}
          >
            <span className="text-[11px] font-semibold opacity-80">{d === today ? 'Hoy' : formatWeekdayShort(d)}</span>
            <span className="tabular text-[17px] font-bold">{fromISO(d).getDate()}</span>
          </button>
        ))}
      </div>

      <h3 className="mb-2 text-[14px] font-semibold text-ink2">Comida</h3>
      <div className="mb-4 flex flex-wrap gap-2">
        {allSlots.map((s) => (
          <Chip key={s} selected={slot === s} onClick={() => setSlot(s)}>
            {SLOT_META[s].label}
            {!usable.includes(s) && <span className="ml-1 text-ink3">·</span>}
          </Chip>
        ))}
      </div>
      {!usable.includes(slot) && <p className="-mt-2 mb-3 text-[13px] text-ink3">Esta receta está pensada para {usable.map((s) => SLOT_META[s].label.toLowerCase()).join(' o ')}, pero puedes ponerla aquí.</p>}

      <div className="rounded-[14px] bg-surface2 px-3.5 py-3 text-[14px]" data-add-summary>
        <p className="font-semibold">{formatLong(date)} · {SLOT_META[slot].label}</p>
        {done ? (
          <p className="mt-1 text-warn">Esta comida ya está marcada como {current!.status}. Elige otro día o comida.</p>
        ) : current ? (
          <p className="mt-1 text-ink2">Sustituirá a <strong className="font-semibold text-ink">{currentRecipe ? recipeTitle(currentRecipe) : current.customName ?? 'plato libre'}</strong>. El resto del día no cambia.</p>
        ) : (
          <p className="mt-1 text-ink2">Hueco libre: se añadirá sin tocar otras comidas.</p>
        )}
        {!done && (
          <p className="tabular mt-1 text-ink3">
            Energía del día: {n0(dayBefore.kcal)} → <span className="font-semibold text-ink">{n0(dayAfter)} kcal</span>
            {data.profile.targets.kcal ? ` (objetivo ${n0(data.profile.targets.kcal)})` : ''}
          </p>
        )}
      </div>
    </Sheet>
  );
}
