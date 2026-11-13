import { useCallback } from 'react';
import type { AppData, FoodLogEntry, MealSlot, PlannedMeal } from '../../types';
import { useStore } from '../../store/AppStore';
import { useFeedback } from '../../components/ui/Feedback';
import { startOfWeek } from '../../lib/dates';
import { uid } from '../../lib/format';
import { getFood, getRecipe } from '../../services/catalog';

const foodPer100 = (d: AppData, foodId: string) => { const f = getFood(d, foodId); return f ? { ...f.per100 } : undefined; };
import { logReplacement } from '../../services/planner';
import { recipeTitle } from '../../services/recipeMeta';

function findMeal(d: AppData, id: string): PlannedMeal | undefined {
  for (const w of Object.values(d.plan)) {
    const m = w.find((x) => x.id === id);
    if (m) return m;
  }
  return undefined;
}

/** Acciones sobre comidas del plan y registros, compartidas por Hoy y Plan. */
export function useMealActions() {
  const { mutate } = useStore();
  const { toast } = useFeedback();

  const setStatus = useCallback(
    (meal: PlannedMeal, status: PlannedMeal['status']) => {
      mutate((d) => {
        const m = findMeal(d, meal.id);
        if (m) m.status = status;
      });
    },
    [mutate],
  );

  const toggleDone = useCallback(
    (meal: PlannedMeal) => {
      const next = meal.status === 'hecha' ? 'pendiente' : 'hecha';
      setStatus(meal, next);
      if (next === 'hecha') toast('Comida registrada', { action: { label: 'Deshacer', onClick: () => setStatus(meal, meal.status) } });
    },
    [setStatus, toast],
  );

  const setPortion = useCallback(
    (meal: PlannedMeal, portion: number) => {
      mutate((d) => {
        const m = findMeal(d, meal.id);
        if (m) m.portion = portion;
      });
    },
    [mutate],
  );

  /** Sustituye el plato SOLO al confirmar. Permite deshacer. */
  const swap = useCallback(
    (meal: PlannedMeal, next: { recipeId: string } | { customName: string }, source: 'manual' | 'sorpresa' = 'manual') => {
      const prev = { recipeId: meal.recipeId, customName: meal.customName, accepted: meal.accepted };
      const prevMealSwaps = meal.swaps ? structuredClone(meal.swaps) : undefined;
      mutate((d) => {
        const m = findMeal(d, meal.id);
        if (!m) return;
        delete m.swaps; // las sustituciones de ingredientes eran del plato anterior
        delete m.free;
        m.accepted = true; // elegido por el usuario: no se cambia al regenerar la propuesta
        logReplacement(d, { date: m.date, slot: m.slot, fromRecipeId: prev.recipeId, toRecipeId: 'recipeId' in next ? next.recipeId : null, source });
        if ('recipeId' in next) {
          m.recipeId = next.recipeId;
          delete m.customName;
        } else {
          m.recipeId = null;
          m.customName = next.customName;
        }
      });
      const nr = 'recipeId' in next ? getRecipe({ customRecipes: [] }, next.recipeId) : undefined;
      const name = 'recipeId' in next ? (nr ? recipeTitle(nr) : 'el nuevo plato') : next.customName;
      toast(`Cambiado por ${name}`, {
        action: {
          label: 'Deshacer',
          onClick: () =>
            mutate((d) => {
              const m = findMeal(d, meal.id);
              if (!m) return;
              m.recipeId = prev.recipeId;
              m.accepted = prev.accepted;
              if (!m.accepted) delete m.accepted;
              d.replacements?.pop();
              if (prevMealSwaps) m.swaps = prevMealSwaps;
              if (prev.customName) m.customName = prev.customName;
              else delete m.customName;
            }),
        },
      });
    },
    [mutate, toast],
  );

  /**
   * Sustituye un ingrediente de la receta SOLO en esta comida (meal.swaps).
   * `originalFoodId` es el ingrediente de la receta; `next = null` restaura el original.
   */
  const swapIngredient = useCallback(
    (meal: PlannedMeal, originalFoodId: string, next: { foodId: string; amount: number } | null, labels: { from: string; to: string }) => {
      const prevSwap = meal.swaps?.[originalFoodId];
      const before = prevSwap ? { ...prevSwap } : undefined;
      const apply = (val: { foodId: string; amount: number } | undefined) =>
        mutate((d) => {
          const m = findMeal(d, meal.id);
          if (!m) return;
          if (val && (val.foodId !== originalFoodId || val.amount <= 0)) {
            m.swaps = { ...(m.swaps ?? {}), [originalFoodId]: { ...val } };
          } else if (m.swaps) {
            delete m.swaps[originalFoodId];
            if (!Object.keys(m.swaps).length) delete m.swaps;
          }
        });
      apply(next ?? undefined);
      toast(!next ? `${labels.to} restaurado` : next.amount <= 0 ? `${labels.from} quitado de esta comida` : `${labels.from} → ${labels.to}`, {
        action: { label: 'Deshacer', onClick: () => apply(before) },
      });
    },
    [mutate, toast],
  );

  const addLog = useCallback(
    (entry: Omit<FoodLogEntry, 'id' | 'createdAt'>, silent = false) => {
      const id = uid('log');
      mutate((d) => {
        // copia de los valores del alimento: si después se corrige la base, este registro no cambia
        const per100 = !entry.snapshot && entry.foodId ? foodPer100(d, entry.foodId) : undefined;
        d.log.push({ ...entry, ...(per100 && !entry.per100 ? { per100 } : {}), id, createdAt: new Date().toISOString() });
      });
      if (!silent)
        toast('Alimento añadido', {
          action: { label: 'Deshacer', onClick: () => mutate((d) => void (d.log = d.log.filter((l) => l.id !== id))) },
        });
      return id;
    },
    [mutate, toast],
  );

  const updateLog = useCallback(
    (id: string, patch: Partial<Pick<FoodLogEntry, 'amount' | 'slot' | 'date'>>) => {
      mutate((d) => {
        const l = d.log.find((x) => x.id === id);
        if (l) Object.assign(l, patch);
      });
      toast('Registro actualizado');
    },
    [mutate, toast],
  );

  const removeLog = useCallback(
    (entry: FoodLogEntry) => {
      mutate((d) => void (d.log = d.log.filter((l) => l.id !== entry.id)));
      toast('Registro eliminado', { action: { label: 'Deshacer', onClick: () => mutate((d) => void d.log.push(entry)) } });
    },
    [mutate, toast],
  );

  /** Añade un plato al plan en un hueco vacío (si el usuario lo tenía desactivado o se borró). */
  const addPlanned = useCallback(
    (date: string, slot: MealSlot, recipeId: string) => {
      mutate((d) => {
        const key = startOfWeek(date);
        d.plan[key] ??= [];
        d.plan[key].push({ id: uid('pm'), date, slot, recipeId, portion: 1, status: 'pendiente', accepted: true });
      });
    },
    [mutate],
  );

  /** Comida libre: se salta el plato del plan (se puede volver a él). */
  const setFree = useCallback(
    (meal: PlannedMeal, free: boolean) => {
      const apply = (v: boolean) =>
        mutate((d) => {
          const m = findMeal(d, meal.id);
          if (!m) return;
          if (v) m.free = true;
          else delete m.free;
        });
      apply(free);
      toast(free ? 'Comida libre: disfrútala' : 'Has vuelto al plato del plan', { action: { label: 'Deshacer', onClick: () => apply(!free) } });
    },
    [mutate, toast],
  );

  return { setFree, toggleDone, setStatus, setPortion, swap, swapIngredient, addLog, updateLog, removeLog, addPlanned };
}
