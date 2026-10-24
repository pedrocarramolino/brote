import { useCallback } from 'react';
import type { AppData, FoodLogEntry, MealSlot, PlannedMeal } from '../../types';
import { useStore } from '../../store/AppStore';
import { useFeedback } from '../../components/ui/Feedback';
import { startOfWeek } from '../../lib/dates';
import { uid } from '../../lib/format';
import { getRecipe } from '../../services/catalog';

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
    (meal: PlannedMeal, next: { recipeId: string } | { customName: string }) => {
      const prev = { recipeId: meal.recipeId, customName: meal.customName };
      mutate((d) => {
        const m = findMeal(d, meal.id);
        if (!m) return;
        if ('recipeId' in next) {
          m.recipeId = next.recipeId;
          delete m.customName;
        } else {
          m.recipeId = null;
          m.customName = next.customName;
        }
      });
      const name = 'recipeId' in next ? getRecipe({ customRecipes: [] }, next.recipeId)?.name ?? 'el nuevo plato' : next.customName;
      toast(`Cambiado por ${name}`, {
        action: {
          label: 'Deshacer',
          onClick: () =>
            mutate((d) => {
              const m = findMeal(d, meal.id);
              if (!m) return;
              m.recipeId = prev.recipeId;
              if (prev.customName) m.customName = prev.customName;
              else delete m.customName;
            }),
        },
      });
    },
    [mutate, toast],
  );

  const addLog = useCallback(
    (entry: Omit<FoodLogEntry, 'id' | 'createdAt'>, silent = false) => {
      const id = uid('log');
      mutate((d) => {
        d.log.push({ ...entry, id, createdAt: new Date().toISOString() });
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
        d.plan[key].push({ id: uid('pm'), date, slot, recipeId, portion: 1, status: 'pendiente' });
      });
    },
    [mutate],
  );

  return { toggleDone, setStatus, setPortion, swap, addLog, updateLog, removeLog, addPlanned };
}
