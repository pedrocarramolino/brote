import { useCallback } from 'react';
import type { AppData, FoodLogEntry, MealExtra, MealSlot, PlannedMeal } from '../../types';
import { useStore } from '../../store/AppStore';
import { useFeedback } from '../../components/ui/Feedback';
import { startOfWeek } from '../../lib/dates';
import { uid } from '../../lib/format';
import { getFood, getRecipe } from '../../services/catalog';
import { addMacros, ingredientsNutrition, mealIngredients, scaleMacros, type EffectiveIngredient } from '../../services/nutrition';

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

/**
 * Si la comida tenía sus valores congelados (hecha o pasada), se le aplica SOLO la diferencia
 * del ingrediente cambiado: el resto conserva los valores con que se guardó.
 */
function adjustSnapshot(d: AppData, m: PlannedMeal, before: EffectiveIngredient[]) {
  if (!m.snapshot) return;
  const prev = ingredientsNutrition(d, before).macros;
  const next = ingredientsNutrition(d, mealIngredients(d, m)).macros;
  const p = addMacros(m.snapshot.perServing, addMacros(next, scaleMacros(prev, -1)));
  m.snapshot = { ...m.snapshot, perServing: { kcal: Math.max(0, p.kcal), protein: Math.max(0, p.protein), carbs: Math.max(0, p.carbs), fat: Math.max(0, p.fat) }, at: new Date().toISOString() };
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
          const before = mealIngredients(d, m);
          if (val && (val.foodId !== originalFoodId || val.amount <= 0)) {
            m.swaps = { ...(m.swaps ?? {}), [originalFoodId]: { ...val } };
          } else if (m.swaps) {
            delete m.swaps[originalFoodId];
            if (!Object.keys(m.swaps).length) delete m.swaps;
          }
          adjustSnapshot(d, m, before);
        });
      apply(next ?? undefined);
      toast(!next ? `${labels.to} restaurado` : next.amount <= 0 ? `${labels.from} quitado de esta comida` : `${labels.from} → ${labels.to}`, {
        action: { label: 'Deshacer', onClick: () => apply(before) },
      });
    },
    [mutate, toast],
  );

  /**
   * Cambia la cantidad de un ingrediente SOLO en esta comida (por ración planificada).
   * La receta original no se toca: el cambio vive en meal.swaps. Si vuelve a la cantidad de la
   * receta (y es el mismo alimento), el ajuste desaparece. Sin aviso: se llama al escribir.
   */
  const setIngredientAmount = useCallback(
    (meal: PlannedMeal, originalFoodId: string, foodId: string, amount: number) => {
      if (!(amount > 0)) return;
      mutate((d) => {
        const m = findMeal(d, meal.id);
        const r = m && getRecipe(d, m.recipeId);
        if (!m || !r) return;
        const before = mealIngredients(d, m);
        const orig = r.ingredients.find((i) => i.foodId === originalFoodId);
        if (foodId === originalFoodId && orig && Math.abs(orig.amount - amount) < 0.01) {
          if (m.swaps) {
            delete m.swaps[originalFoodId];
            if (!Object.keys(m.swaps).length) delete m.swaps;
          }
        } else {
          m.swaps = { ...(m.swaps ?? {}), [originalFoodId]: { foodId, amount } };
        }
        adjustSnapshot(d, m, before);
      });
    },
    [mutate],
  );

  /**
   * Alimentos añadidos a ESTA comida (meal.extras). La receta no cambia. Al tocarlos, la comida
   * queda aceptada para que «Otra propuesta» no la sustituya y se pierda lo añadido.
   */
  const editExtras = useCallback(
    (meal: PlannedMeal, change: (extras: MealExtra[]) => MealExtra[]) =>
      mutate((d) => {
        const m = findMeal(d, meal.id);
        if (!m) return;
        const before = mealIngredients(d, m);
        const next = change((m.extras ?? []).map((e) => ({ ...e })));
        if (next.length) m.extras = next;
        else delete m.extras;
        m.accepted = true;
        adjustSnapshot(d, m, before);
      }),
    [mutate],
  );

  const addExtra = useCallback(
    (meal: PlannedMeal, foodId: string, amount: number, name: string) => {
      if (!(amount > 0)) return;
      const id = uid('ex');
      editExtras(meal, (xs) => [...xs, { id, foodId, amount, kind: 'extra' }]);
      toast(`${name} añadido a esta comida`, { action: { label: 'Deshacer', onClick: () => editExtras(meal, (xs) => xs.filter((x) => x.id !== id)) } });
    },
    [editExtras, toast],
  );

  /** Cambia la cantidad (sin aviso: se llama al escribir) o el alimento de un añadido. */
  const updateExtra = useCallback(
    (meal: PlannedMeal, id: string, patch: { amount?: number; foodId?: string }) => {
      if (patch.amount !== undefined && !(patch.amount > 0)) return;
      editExtras(meal, (xs) => xs.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    },
    [editExtras],
  );

  const removeExtra = useCallback(
    (meal: PlannedMeal, id: string, name: string) => {
      const prev = meal.extras?.find((x) => x.id === id);
      const idx = meal.extras?.findIndex((x) => x.id === id) ?? -1;
      editExtras(meal, (xs) => xs.filter((x) => x.id !== id));
      if (prev)
        toast(`${name} quitado de esta comida`, {
          action: { label: 'Deshacer', onClick: () => editExtras(meal, (xs) => { const c = [...xs]; c.splice(Math.max(0, idx), 0, prev); return c; }) },
        });
    },
    [editExtras, toast],
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
    (id: string, patch: Partial<Pick<FoodLogEntry, 'amount' | 'slot' | 'date' | 'quantity' | 'unit'>>) => {
      mutate((d) => {
        const l = d.log.find((x) => x.id === id);
        if (!l) return;
        Object.assign(l, patch);
        // cantidad en g/ml: la unidad mostrada se quita si no se indica
        if ('amount' in patch && !('unit' in patch)) { delete l.quantity; delete l.unit; }
        if (patch.unit === undefined && 'unit' in patch) { delete l.quantity; delete l.unit; }
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

  return { setFree, toggleDone, setStatus, setPortion, swap, swapIngredient, setIngredientAmount, addExtra, updateExtra, removeExtra, addLog, updateLog, removeLog, addPlanned };
}
