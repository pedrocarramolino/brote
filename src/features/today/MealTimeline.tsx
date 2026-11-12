import { ArrowLeftRight, Ban, Check, Minus, Plus, RotateCcw } from 'lucide-react';
import type { FoodLogEntry, ISODate, MealSlot, PlannedMeal } from '../../types';
import { useData } from '../../store/AppStore';
import { getFood, getRecipe, SLOT_META, slotsOrdered } from '../../services/catalog';
import { foodMacros, plannedMealNutrition } from '../../services/nutrition';
import { cx } from '../../components/ui/primitives';
import { MoreMenu } from '../../components/ui/Menu';
import { n0 } from '../../lib/format';
import { MacroInline, RecipeCover } from '../meals/RecipeBits';
import { useMealActions } from '../meals/useMealActions';
import { recipeTitle } from '../../services/recipeMeta';

const titleOf = (r: { title?: string; name: string } | undefined) => (r ? recipeTitle(r) : undefined);

interface Props {
  date: ISODate;
  meals: PlannedMeal[];
  onOpenRecipe: (m: PlannedMeal) => void;
  onSwap: (m: PlannedMeal) => void;
  onAddFood: (slot: MealSlot) => void;
  onEditLog: (e: FoodLogEntry) => void;
}

export function StatusNode({ meal, onToggle, size = 30 }: { meal: PlannedMeal; onToggle: () => void; size?: number }) {
  const done = meal.status === 'hecha';
  const skipped = meal.status === 'omitida';
  const name = titleOf(getRecipe({ customRecipes: [] }, meal.recipeId)) ?? meal.customName ?? SLOT_META[meal.slot].label;
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={done}
      aria-label={done ? `Marcar ${name} como pendiente` : `Marcar ${name} como hecha`}
      className="press -m-[7px] flex shrink-0 items-center justify-center rounded-full p-[7px]"
    >
      <span
        key={meal.status}
        className={cx(
          'flex items-center justify-center rounded-full transition-colors',
          done ? 'anim-pop bg-accent text-accentInk' : skipped ? 'bg-surface2 text-ink3' : 'bg-surface text-transparent ring-2 ring-inset ring-line hover:ring-accent/60',
        )}
        style={{ width: size, height: size }}
      >
        {done ? <Check size={size * 0.56} strokeWidth={3} /> : skipped ? <Minus size={size * 0.5} strokeWidth={3} /> : null}
      </span>
    </button>
  );
}

export function MealTimeline({ date, meals, onOpenRecipe, onSwap, onAddFood, onEditLog }: Props) {
  const data = useData();
  const { toggleDone, setStatus } = useMealActions();
  const slots = slotsOrdered(data.profile.mealSlots);

  return (
    <ol className="relative">
      {slots.map((slot, i) => {
        const meal = meals.find((m) => m.slot === slot);
        const logs = data.log.filter((l) => l.date === date && l.slot === slot);
        const recipe = meal ? getRecipe(data, meal.recipeId) : undefined;
        const n = meal ? plannedMealNutrition(data, meal).macros : null;
        const time = data.profile.schedule[slot] ?? SLOT_META[slot].time;
        const last = i === slots.length - 1;
        return (
          <li key={slot} className="relative flex gap-2.5 pb-4 sm:gap-4">
            {/* Columna de hora y línea temporal */}
            <div className="flex w-[44px] shrink-0 flex-col items-center pt-3.5 sm:w-[60px]">
              <span className="tabular text-[13px] font-semibold text-ink2">{time}</span>
              <div className="mt-2.5">
                {meal ? <StatusNode meal={meal} onToggle={() => toggleDone(meal)} /> : <span className="block h-[30px] w-[30px] rounded-full border-2 border-dashed border-line" />}
              </div>
              {!last && <span className={cx('mt-2 w-[2px] flex-1 rounded-full', meal?.status === 'hecha' ? 'bg-accent/40' : 'bg-line')} aria-hidden="true" />}
            </div>

            <div className="min-w-0 flex-1">
              <div className={cx('rounded-xl2 bg-surface shadow-card ring-1 ring-line/60 transition-opacity', meal?.status === 'omitida' && 'opacity-60')}>
                <div className="flex items-center justify-between px-4 pb-0 pt-3">
                  <h3 className="text-[13px] font-semibold uppercase tracking-wide text-ink3">{SLOT_META[slot].label}</h3>
                  {meal?.status === 'omitida' && <span className="text-[12px] font-semibold text-ink3">Omitida</span>}
                  {meal?.status === 'hecha' && <span className="text-[12px] font-semibold text-accent-deep">Hecha</span>}
                </div>
                {meal ? (
                  <div className="flex items-center gap-1 pb-2 pl-2 pr-1">
                    <button type="button" data-open-recipe={meal.id} onClick={() => onOpenRecipe(meal)} className="flex min-w-0 flex-1 items-center gap-3 rounded-[14px] p-2 text-left hover:bg-surface2/60" disabled={!recipe || recipe.custom}>
                      <RecipeCover recipe={recipe} size={52} />
                      <span className="min-w-0 flex-1">
                        <span className={cx('block text-[16px] font-semibold leading-snug', meal.status === 'omitida' && 'line-through')}>
                          {titleOf(recipe) ?? meal.customName ?? 'Plato sin receta'}
                        </span>
                        {recipe?.title && <span className="block truncate text-[13px] leading-snug text-ink3">{recipe.name}</span>}
                        {n ? (
                          <MacroInline m={n} className="mt-0.5" />
                        ) : (
                          <span className="mt-0.5 block text-[13px] text-warn">Sin valores nutricionales verificados</span>
                        )}
                        {recipe && meal.portion !== 1 && <span className="text-[12px] text-ink3">Ración ×{String(meal.portion).replace('.', ',')}</span>}
                      </span>
                    </button>
                    <MoreMenu
                      label={`Opciones de ${SLOT_META[slot].label.toLowerCase()}`}
                      items={[
                        { label: 'Cambiar plato', icon: <ArrowLeftRight size={18} />, onSelect: () => onSwap(meal) },
                        { label: 'Añadir alimento', icon: <Plus size={18} />, onSelect: () => onAddFood(slot) },
                        meal.status === 'omitida'
                          ? { label: 'Restaurar', icon: <RotateCcw size={18} />, onSelect: () => setStatus(meal, 'pendiente') }
                          : { label: 'Omitir esta comida', icon: <Ban size={18} />, onSelect: () => setStatus(meal, 'omitida') },
                      ]}
                    />
                  </div>
                ) : (
                  <p className="px-4 pb-3 pt-1 text-[14px] text-ink2">Sin plato planificado.</p>
                )}

                {logs.length > 0 && (
                  <ul className="mx-4 border-t border-line/60 py-1.5">
                    {logs.map((l) => {
                      const f = getFood(data, l.foodId);
                      return (
                        <li key={l.id}>
                          <button type="button" onClick={() => onEditLog(l)} className="flex min-h-[40px] w-full items-center justify-between gap-3 rounded-[8px] text-left text-[14px] hover:bg-surface2/60">
                            <span className="min-w-0 truncate">
                              <span className="font-medium">{f?.name ?? 'Alimento eliminado'}</span>
                              <span className="tabular text-ink3"> · {n0(l.amount)} {f?.unit}</span>
                            </span>
                            <span className="tabular shrink-0 text-ink2">{f ? `${n0(foodMacros(f, l.amount).kcal)} kcal` : '—'}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}

                <div className="flex gap-1 border-t border-line/60 px-2 py-1">
                  {meal && (
                    <button type="button" onClick={() => onSwap(meal)} className="press inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[14px] font-semibold text-accent hover:bg-accentSoft/60">
                      <ArrowLeftRight size={16} /> Cambiar<span className="hidden sm:inline">&nbsp;plato</span>
                    </button>
                  )}
                  <button type="button" onClick={() => onAddFood(slot)} className="press inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-[14px] font-semibold text-accent hover:bg-accentSoft/60">
                    <Plus size={16} /> <span className="sm:hidden">Alimento</span><span className="hidden sm:inline">Añadir alimento</span>
                  </button>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
